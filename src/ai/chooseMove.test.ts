import { describe, expect, it } from 'vitest'
import {
  applyMoves,
  endTurn,
  generateMoveSequences,
  getWinner,
  isLegalSequence,
  rollForTurn,
  startGame,
} from '../engine/index.ts'
import type { Rng } from '../engine/index.ts'
import { buildState } from '../engine/testHelpers.ts'
import { chooseMoveSequence } from './chooseMove.ts'

function seededRng(seed: number): Rng {
  let value = seed >>> 0
  return () => {
    value = (1664525 * value + 1013904223) >>> 0
    return value / 0x100000000
  }
}

function randomGameStates(count: number, rng: Rng) {
  const states = []
  while (states.length < count) {
    let state = startGame(rng)
    while (states.length < count && getWinner(state) === null) {
      if (state.dice.length > 0) states.push(state)
      const legal = generateMoveSequences(state)
      if (legal.length > 0) {
        const sequence = legal[Math.floor(rng() * legal.length)]
        state = applyMoves(state, sequence.moves)
      }
      if (getWinner(state) !== null) break
      state = rollForTurn(endTurn(state), rng)
    }
  }
  return states
}

describe('chooseMoveSequence', () => {
  it('always returns a legal sequence or null across random game states', () => {
    const states = randomGameStates(500, seededRng(12345))
    for (const state of states) {
      const legal = generateMoveSequences(state)
      for (const difficulty of ['easy', 'normal'] as const) {
        const choice = chooseMoveSequence(state, {
          difficulty,
          rng: seededRng(67890),
        })
        if (legal.length === 0) {
          expect(choice).toBeNull()
        } else {
          expect(choice).not.toBeNull()
          expect(legal.map((sequence) => JSON.stringify(sequence.moves))).toContain(
            JSON.stringify(choice!.moves),
          )
          expect(choice!.result).toEqual(applyMoves(state, choice!.moves))
          expect(isLegalSequence(state, choice!.moves)).toBe(true)
        }
      }
    }
  })

  it('normal difficulty prefers hitting an exposed blot', () => {
    const state = buildState({
      white: { 13: 2, 8: 2, 6: 1 },
      black: { 3: 1, 1: 2, 12: 5, 17: 3, 19: 4 },
      turn: 'white',
      dice: [3, 1],
    })
    const legal = generateMoveSequences(state)
    expect(legal.some((sequence) => sequence.moves.every((move) => !move.hit))).toBe(true)

    const choice = chooseMoveSequence(state, { difficulty: 'normal', rng: () => 0 })
    expect(choice).not.toBeNull()
    expect(choice!.moves.some((move) => move.hit)).toBe(true)
  })

  it('normal difficulty prefers bearing off', () => {
    const state = buildState({
      white: { 1: 9, 2: 4, 4: 1, 6: 1 },
      black: { 19: 15 },
      turn: 'white',
      dice: [6, 5],
    })
    const choice = chooseMoveSequence(state, { difficulty: 'normal' })
    expect(choice).not.toBeNull()
    expect(choice!.result.off.white).toBe(2)
  })

  it('returns null when no legal moves are available', () => {
    const blocked = buildState({
      white: { 13: 14 },
      black: { 19: 2, 20: 2, 21: 2, 22: 2, 23: 2, 24: 2 },
      bar: { white: 1 },
      turn: 'white',
      dice: [3, 4],
    })
    for (const difficulty of ['easy', 'normal'] as const) {
      expect(chooseMoveSequence(blocked, { difficulty })).toBeNull()
    }

    const noDice = buildState({ white: { 13: 14 }, turn: 'white', dice: [] })
    for (const difficulty of ['easy', 'normal'] as const) {
      expect(chooseMoveSequence(noDice, { difficulty })).toBeNull()
    }
  })
})
