import { describe, expect, it } from 'vitest'
import {
  applyMove,
  createInitialState,
  generateMoveSequences,
  generateSingleMoves,
  isLegalSequence,
  maxPlayableDice,
} from '../engine/index.ts'
import type { GameState, Move } from '../engine/index.ts'
import { buildState } from '../engine/testHelpers.ts'
import { formatTurn, pickMove, turnOptions } from './turn.ts'

describe('turnOptions', () => {
  it('agrees with isLegalSequence on every candidate first move', () => {
    const states: GameState[] = [
      createInitialState('white', [3, 1]),
      createInitialState('white', [6, 6]),
      createInitialState('white', [2, 1]),
      buildState({
        white: { 6: 1, 1: 14 },
        black: { 3: 2, 5: 2, 4: 2, 24: 9 },
        dice: [5, 3],
      }),
    ]

    for (const state of states) {
      const expected: Move[] = []
      for (const die of new Set(state.dice)) {
        for (const move of generateSingleMoves(state, die)) {
          const continuations = generateMoveSequences(applyMove(state, move))
          const beginsLegal =
            continuations.length === 0
              ? isLegalSequence(state, [move])
              : continuations.some((c) => isLegalSequence(state, [move, ...c.moves]))
          if (beginsLegal) expected.push(move)
        }
      }
      expect(turnOptions(state).firstMoves).toEqual(expected)
    }
  })

  it('lists every legal opening move from each point', () => {
    const { firstMoves, sequences } = turnOptions(createInitialState('white', [3, 1]))
    expect(sequences.length).toBeGreaterThan(0)
    const from8 = firstMoves.filter((m) => m.from === 8).map((m) => m.to)
    expect(from8.sort()).toEqual([5, 7])
  })

  it('accepts either order of the dice even though sequences are deduplicated', () => {
    const state = buildState({ white: { 13: 1, 1: 14 }, black: { 24: 15 }, dice: [2, 1] })
    const { firstMoves } = turnOptions(state)
    expect(firstMoves.map((m) => m.to).sort()).toEqual([11, 12])
  })

  it('excludes a first move that would leave the second die unplayable', () => {
    // 8/5 is a legal single move, but it strands the 4 (5/1 and 6/2 are blocked).
    const state = buildState({
      white: { 8: 1, 6: 1 },
      black: { 1: 2, 2: 2, 24: 11 },
      off: { white: 13 },
      dice: [4, 3],
    })
    expect(generateSingleMoves(state, 3)).toContainEqual({ from: 8, to: 5, die: 3, hit: false })
    const { firstMoves } = turnOptions(state)
    expect(firstMoves.sort((a, b) => Number(a.from) - Number(b.from))).toEqual([
      { from: 6, to: 3, die: 3, hit: false },
      { from: 8, to: 4, die: 4, hit: false },
    ])
  })

  it('offers only the larger die when just one can be played', () => {
    const state = buildState({
      white: { 6: 1, 1: 14 },
      black: { 3: 2, 5: 2, 4: 2, 24: 9 },
      dice: [5, 3],
    })
    const { firstMoves } = turnOptions(state)
    expect(firstMoves).toEqual([{ from: 6, to: 1, die: 5, hit: false }])
  })

  it('returns nothing when the turn is forfeited', () => {
    const state = buildState({
      white: { 6: 1, 1: 14 },
      black: { 3: 2, 4: 2, 24: 11 },
      dice: [3, 2],
    })
    expect(turnOptions(state)).toEqual({ sequences: [], firstMoves: [] })
  })
})

describe('doubles from the same point', () => {
  const bearoff = buildState({
    white: { 3: 4, 1: 2 },
    black: { 24: 15 },
    off: { white: 9 },
    turn: 'white',
    dice: [3, 3, 3, 3],
  })
  const regular = buildState({
    white: { 13: 5, 8: 3, 6: 5, 24: 2 },
    black: { 1: 2, 12: 5, 17: 3, 19: 5 },
    turn: 'white',
    dice: [3, 3, 3, 3],
  })

  it('allows four consecutive bear-offs from one point', () => {
    const sequences = generateMoveSequences(bearoff)
    expect(sequences.some((sequence) =>
      sequence.moves.length === 4 &&
      sequence.moves.every((move) => move.from === 3 && move.to === 'off'),
    )).toBe(true)
    expect(maxPlayableDice(bearoff)).toBe(4)
  })

  it('allows repeated moves from one point in a regular position', () => {
    expect(
      generateMoveSequences(regular).some(
        (sequence) => sequence.moves.filter((move) => move.from === 13).length >= 2,
      ),
    ).toBe(true)
  })

  it('picks four consecutive bear-offs from one point in the UI options', () => {
    let current = bearoff
    for (let i = 0; i < 4; i += 1) {
      const move = pickMove(turnOptions(current).firstMoves, 3, 'off')
      expect(move).toBeDefined()
      current = applyMove(current, move!)
    }
    expect(current.dice).toEqual([])
    expect(current.off.white).toBe(13)
  })

  it('picks repeated moves from one point in the UI options', () => {
    let current = regular
    for (let i = 0; i < 2; i += 1) {
      const move = pickMove(turnOptions(current).firstMoves, 13, 10)
      expect(move).toBeDefined()
      current = applyMove(current, move!)
    }
    expect(current.points[9]).toMatchObject({ player: 'white', count: 2 })
    expect(current.points[12]).toMatchObject({ player: 'white', count: 3 })
  })
})

describe('pickMove', () => {
  it('prefers the smaller die when both reach the same destination', () => {
    const moves = [
      { from: 6, to: 3, die: 3, hit: false },
      { from: 6, to: 3, die: 3, hit: false },
      { from: 6, to: 1, die: 5, hit: false },
    ]
    expect(pickMove(moves, 6, 1)?.die).toBe(5)
    expect(pickMove(moves, 6, 2)).toBeUndefined()
  })
})

describe('formatTurn', () => {
  it('uses standard notation from the mover’s perspective', () => {
    expect(
      formatTurn('white', [3, 1], [
        { from: 8, to: 5, die: 3, hit: false },
        { from: 6, to: 5, die: 1, hit: false },
      ]),
    ).toBe('White 3-1: 8/5 6/5')
    expect(
      formatTurn('black', [6, 6, 6, 6], [
        { from: 'bar', to: 6, die: 6, hit: true },
        { from: 19, to: 'off', die: 6, hit: false },
      ]),
    ).toBe('Black 6-6: bar/19* 6/off')
    expect(formatTurn('white', [2, 1], [])).toBe('White 2-1: (no move)')
  })
})
