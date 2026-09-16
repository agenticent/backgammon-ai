import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { chooseMoveSequence } from './ai/index.ts'
import type { Difficulty } from './ai/index.ts'
import { pipCount } from './ai/index.ts'
import {
  applyMove,
  createInitialState,
  endTurn,
  isTurnComplete,
  isTurnForfeited,
  openingRoll,
  playMoveSequence,
  rollForTurn,
  winner,
} from './engine/index.ts'
import type { Move, MoveSource, MoveTarget, Rng } from './engine/index.ts'
import { Board } from './components/Board.tsx'
import { defaultStorage, loadSession, saveSession } from './game/session.ts'
import type { Session } from './game/session.ts'
import { formatTurn, movesFrom, pickMove, playerName, turnOptions } from './game/turn.ts'
import './App.css'

export interface AppProps {
  rng?: Rng
  /** Delay before each AI action, in milliseconds. */
  aiDelay?: number
  /** Delay before a turn with no legal moves is passed, in milliseconds. */
  passDelay?: number
  storage?: Storage | null
}

const HUMAN = 'white'
const AI = 'black'

function newSession(difficulty: Difficulty, rng: Rng): Session {
  const opening = openingRoll(rng)
  const state = createInitialState(opening.first, opening.dice)
  return {
    difficulty,
    state,
    turnStart: state,
    turnMoves: [],
    log: [
      `Opening roll: White ${opening.white}, Black ${opening.black} — ${playerName(opening.first)} moves first`,
    ],
  }
}

function Dice({ dice }: { dice: number[] }) {
  if (dice.length === 0) return <span className="dice empty">–</span>
  return (
    <span className="dice" aria-label={`Dice ${dice.join(' ')}`}>
      {dice.map((die, i) => (
        <span key={i} className="die">
          {die}
        </span>
      ))}
    </span>
  )
}

function App({ rng = Math.random, aiDelay = 700, passDelay = 1500, storage }: AppProps) {
  const store = storage === undefined ? defaultStorage() : storage
  const [session, setSession] = useState<Session | null>(() => loadSession(store))
  const [difficulty, setDifficulty] = useState<Difficulty>(session?.difficulty ?? 'normal')
  const [selected, setSelected] = useState<MoveSource | null>(null)
  const logRef = useRef<HTMLOListElement>(null)

  useEffect(() => {
    saveSession(session, store)
  }, [session, store])

  const logLength = session?.log.length ?? 0
  useEffect(() => {
    logRef.current?.lastElementChild?.scrollIntoView({ block: 'nearest' })
  }, [logLength])

  const state = session?.state ?? null
  const gameWinner = state ? winner(state) : null
  const humanMoving = state !== null && gameWinner === null && state.turn === HUMAN && state.dice.length > 0
  const options = useMemo(
    () => (humanMoving && state ? turnOptions(state) : { sequences: [], firstMoves: [] }),
    [humanMoving, state],
  )
  const forfeited = humanMoving && state !== null && isTurnForfeited(state)

  const finishTurn = useCallback((current: Session, moves: Move[]) => {
    const played = playMoveSequence(current.turnStart, moves)
    const next = endTurn(played)
    return {
      ...current,
      state: next,
      turnStart: next,
      turnMoves: [],
      log: [...current.log, formatTurn(current.turnStart.turn, current.turnStart.dice, moves)],
    }
  }, [])

  // AI turn: roll, then (after another beat) play the chosen sequence.
  useEffect(() => {
    if (!state || gameWinner || state.turn !== AI) return
    const timer = setTimeout(() => {
      setSession((current) => {
        if (!current || current.state.turn !== AI || winner(current.state)) return current
        if (current.state.dice.length === 0) {
          const rolled = rollForTurn(current.state, rng)
          return { ...current, state: rolled, turnStart: rolled, turnMoves: [] }
        }
        const choice = chooseMoveSequence(current.state, { difficulty: current.difficulty, rng })
        return finishTurn(current, choice?.moves ?? [])
      })
    }, aiDelay)
    return () => clearTimeout(timer)
  }, [state, gameWinner, rng, aiDelay, finishTurn])

  // Human has dice but nothing to play: pass automatically.
  useEffect(() => {
    if (!forfeited) return
    const timer = setTimeout(() => {
      setSession((current) => {
        if (!current || current.state.turn !== HUMAN || !isTurnForfeited(current.state)) return current
        return finishTurn(current, current.turnMoves)
      })
    }, passDelay)
    return () => clearTimeout(timer)
  }, [forfeited, passDelay, finishTurn])

  const startGame = () => {
    setSelected(null)
    setSession(newSession(difficulty, rng))
  }

  const roll = () => {
    setSelected(null)
    setSession((current) => {
      if (!current || current.state.dice.length > 0) return current
      const rolled = rollForTurn(current.state, rng)
      return { ...current, state: rolled, turnStart: rolled, turnMoves: [] }
    })
  }

  const undo = () => {
    setSelected(null)
    setSession((current) =>
      current ? { ...current, state: current.turnStart, turnMoves: [] } : current,
    )
  }

  const moveTo = (target: MoveTarget) => {
    if (!session || selected === null) return
    const move = pickMove(options.firstMoves, selected, target)
    if (!move) return
    const applied = applyMove(session.state, move)
    const moves = [...session.turnMoves, move]
    setSelected(null)
    if (isTurnComplete(applied)) {
      setSession(finishTurn(session, moves))
    } else {
      setSession({ ...session, state: applied, turnMoves: moves })
    }
  }

  const select = (source: MoveSource) => {
    setSelected((current) => (current === source ? null : source))
  }

  if (!session || !state) {
    return (
      <main className="start">
        <h1>Backgammon AI</h1>
        <p>You play White against the computer.</p>
        <label>
          Difficulty
          <select
            value={difficulty}
            onChange={(event) => setDifficulty(event.target.value as Difficulty)}
          >
            <option value="easy">Easy</option>
            <option value="normal">Normal</option>
          </select>
        </label>
        <button type="button" className="primary" onClick={startGame}>
          New Game
        </button>
      </main>
    )
  }

  const sources = humanMoving && !forfeited ? [...new Set(options.firstMoves.map((m) => m.from))] : []
  const destinations =
    selected !== null ? [...new Set(movesFrom(options.firstMoves, selected).map((m) => m.to))] : []
  const canRoll = gameWinner === null && state.turn === HUMAN && state.dice.length === 0
  const canUndo = humanMoving && session.turnMoves.length > 0

  let status: string
  if (gameWinner) status = `${playerName(gameWinner)} wins!`
  else if (state.turn === AI) status = state.dice.length ? 'Black is thinking…' : 'Black is rolling…'
  else if (canRoll) status = 'Your turn — roll the dice'
  else if (forfeited) status = 'No legal moves — passing'
  else if (selected !== null) status = 'Choose a destination'
  else status = 'Click a checker to move'

  return (
    <main className="game">
      <header className="hud">
        <div className="hud-item">
          <span className="label">Turn</span>
          <span className="value" data-testid="turn">
            {playerName(state.turn)}
          </span>
        </div>
        <div className="hud-item">
          <span className="label">Dice</span>
          <Dice dice={state.dice} />
        </div>
        <div className="hud-item">
          <span className="label">Pips</span>
          <span className="value" data-testid="pips">
            W {pipCount(state, 'white')} · B {pipCount(state, 'black')}
          </span>
        </div>
        <div className="hud-item">
          <span className="label">Level</span>
          <span className="value">{session.difficulty}</span>
        </div>
      </header>

      <section className="board-wrap">
        <Board
          state={state}
          sources={sources}
          selected={selected}
          destinations={destinations}
          onSelect={select}
          onMoveTo={moveTo}
        />
        {gameWinner && (
          <div className="banner" role="alert">
            <h2>{playerName(gameWinner)} wins!</h2>
            <button type="button" className="primary" onClick={startGame}>
              Play Again
            </button>
          </div>
        )}
      </section>

      <div className="controls">
        <p className="status" role="status">
          {status}
        </p>
        <div className="buttons">
          <button type="button" className="primary" onClick={roll} disabled={!canRoll}>
            Roll
          </button>
          <button type="button" onClick={undo} disabled={!canUndo}>
            Undo
          </button>
          <button
            type="button"
            onClick={() => {
              setSelected(null)
              setSession(null)
            }}
          >
            Quit
          </button>
        </div>
      </div>

      <aside className="log" aria-label="Move log">
        <h2>Moves</h2>
        <ol ref={logRef}>
          {session.log.map((entry, i) => (
            <li key={i}>{entry}</li>
          ))}
        </ol>
      </aside>
    </main>
  )
}

export default App
