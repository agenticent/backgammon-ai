import { deserializeGameState, serializeGameState } from '../engine/index.ts'
import type { GameState, Move } from '../engine/index.ts'
import type { Difficulty } from '../ai/index.ts'

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
    return {
      difficulty,
      state: deserializeGameState(state),
      turnStart: deserializeGameState(turnStart),
      turnMoves,
      log,
    }
  } catch {
    return null
  }
}

export function loadSession(storage: Storage | undefined = globalThis.localStorage): Session | null {
  const json = storage?.getItem(STORAGE_KEY)
  return json ? deserializeSession(json) : null
}

export function saveSession(
  session: Session | null,
  storage: Storage | undefined = globalThis.localStorage,
): void {
  if (!storage) return
  if (session === null) storage.removeItem(STORAGE_KEY)
  else storage.setItem(STORAGE_KEY, serializeSession(session))
}
