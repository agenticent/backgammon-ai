import { describe, expect, it } from 'vitest'
import {
  applyMove,
  createInitialState,
  serializeGameState,
} from '../engine/index.ts'
import type { Move } from '../engine/index.ts'
import { buildState } from '../engine/testHelpers.ts'
import {
  deserializeSession,
  loadSession,
  saveSession,
  serializeSession,
  type Session,
} from './session.ts'

const throwing = {
  getItem() {
    throw new Error('blocked')
  },
  setItem() {
    throw new Error('quota')
  },
  removeItem() {
    throw new Error('blocked')
  },
} as unknown as Storage

const someValidSession: Session = {
  difficulty: 'normal',
  state: createInitialState('white', [3, 1]),
  turnStart: createInitialState('white', [3, 1]),
  turnMoves: [],
  log: [],
}

describe('session persistence', () => {
  it('returns null when storage is unavailable', () => {
    expect(loadSession(throwing)).toBeNull()
  })

  it('swallows storage write failures', () => {
    expect(() => saveSession(null, throwing)).not.toThrow()
    expect(() => saveSession(someValidSession, throwing)).not.toThrow()
  })

  it('does not fall back to localStorage when given null', () => {
    localStorage.setItem('backgammon-ai/session', 'saved')

    expect(loadSession(null)).toBeNull()
    saveSession(null, null)
    expect(localStorage.getItem('backgammon-ai/session')).toBe('saved')
  })

  it('rejects a session whose state does not match turnStart plus turnMoves', () => {
    const turnStart = createInitialState('white', [3, 1])
    const move: Move = { from: 8, to: 5, die: 3, hit: false }
    const state = applyMove(turnStart, move)
    const json = serializeSession({
      difficulty: 'normal',
      state,
      turnStart,
      turnMoves: [],
      log: [],
    })

    expect(deserializeSession(json)).toBeNull()
  })

  it("rejects partial moves on the AI's turn", () => {
    const turnStart = createInitialState('black', [3, 1])
    const move: Move = { from: 17, to: 20, die: 3, hit: false }
    const state = applyMove(turnStart, move)
    const json = serializeSession({
      difficulty: 'normal',
      state,
      turnStart,
      turnMoves: [move],
      log: [],
    })

    expect(deserializeSession(json)).toBeNull()
  })

  it('round-trips a consistent mid-turn session', () => {
    const turnStart = createInitialState('white', [3, 1])
    const move: Move = { from: 8, to: 5, die: 3, hit: false }
    const state = applyMove(turnStart, move)
    const json = serializeSession({
      difficulty: 'normal',
      state,
      turnStart,
      turnMoves: [move],
      log: [],
    })

    const result = deserializeSession(json)
    expect(result).not.toBeNull()
    expect(result?.turnMoves).toHaveLength(1)
    expect(serializeGameState(result!.state)).toBe(serializeGameState(state))
  })

  it('rejects saved moves that cannot be completed into a legal turn', () => {
    const turnStart = buildState({
      white: { 11: 1, 20: 1 },
      black: { 5: 2, 9: 2, 22: 11 },
      off: { white: 13 },
      turn: 'white',
      dice: [6, 5],
    })
    const stranded: Move = { from: 20, to: 15, die: 5, hit: false }
    const json = serializeSession({
      difficulty: 'normal',
      state: applyMove(turnStart, stranded),
      turnStart,
      turnMoves: [stranded],
      log: [],
    })

    expect(deserializeSession(json)).toBeNull()
  })
})
