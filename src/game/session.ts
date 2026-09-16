import {
  applyMove,
  deserializeGameState,
  generateSingleMoves,
  serializeGameState,
} from '../engine/index.ts'
import type { GameState, Move } from '../engine/index.ts'
import type { Difficulty } from '../ai/index.ts'
import { canCompleteTurn } from './turn.ts'

export interface Session {
  difficulty: Difficulty
  /** Current position, possibly part-way through the human's turn. */
  state: GameState
  /** Position when the current turn's dice were rolled; Undo returns here. */
  turnStart: GameState
  /** Moves the human has made so far this turn. */
  turnMoves: Move[]
  log: string[]
}

export const STORAGE_KEY = 'backgammon-ai/session'

export function defaultStorage(): Storage | undefined {
  try {
    return globalThis.localStorage
  } catch {
    return undefined
  }
}

function isMove(value: unknown): value is Move {
  if (typeof value !== 'object' || value === null) return false
  const { from, to, die, hit } = value as Record<string, unknown>
  return (
    (from === 'bar' || typeof from === 'number') &&
    (to === 'off' || typeof to === 'number') &&
    typeof die === 'number' &&
    typeof hit === 'boolean'
  )
}

export function serializeSession(session: Session): string {
  return JSON.stringify({
    difficulty: session.difficulty,
    state: serializeGameState(session.state),
    turnStart: serializeGameState(session.turnStart),
    turnMoves: session.turnMoves,
    log: session.log,
  })
}

/** Returns null for anything that is not a well-formed saved session. */
export function deserializeSession(json: string): Session | null {
  try {
    const parsed: unknown = JSON.parse(json)
    if (typeof parsed !== 'object' || parsed === null) return null
    const { difficulty, state, turnStart, turnMoves, log } = parsed as Record<string, unknown>
    if (difficulty !== 'easy' && difficulty !== 'normal') return null
    if (typeof state !== 'string' || typeof turnStart !== 'string') return null
    if (!Array.isArray(turnMoves) || !turnMoves.every(isMove)) return null
    if (!Array.isArray(log) || !log.every((entry) => typeof entry === 'string')) return null
    const parsedState = deserializeGameState(state)
    const parsedTurnStart = deserializeGameState(turnStart)
    if (turnMoves.length > 0 && parsedTurnStart.turn !== 'white') return null
    let current = parsedTurnStart
    for (const move of turnMoves) {
      if (!current.dice.includes(move.die)) return null
      const legal = generateSingleMoves(current, move.die).find(
        (candidate) => candidate.from === move.from && candidate.to === move.to && candidate.hit === move.hit,
      )
      if (!legal) return null
      current = applyMove(current, legal)
    }
    if (serializeGameState(current) !== serializeGameState(parsedState)) return null
    if (!canCompleteTurn(parsedTurnStart, turnMoves)) return null
    return {
      difficulty,
      state: parsedState,
      turnStart: parsedTurnStart,
      turnMoves,
      log,
    }
  } catch {
    return null
  }
}

/** Passing null disables persistence. */
export function loadSession(storage: Storage | null | undefined = defaultStorage()): Session | null {
  if (!storage) return null
  try {
    const json = storage.getItem(STORAGE_KEY)
    return json ? deserializeSession(json) : null
  } catch {
    return null
  }
}

export function saveSession(
  session: Session | null,
  storage: Storage | null | undefined = defaultStorage(),
): void {
  if (!storage) return
  try {
    if (session === null) storage.removeItem(STORAGE_KEY)
    else storage.setItem(STORAGE_KEY, serializeSession(session))
  } catch {
    // Storage can be unavailable or full.
  }
}
