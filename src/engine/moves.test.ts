import { describe, expect, it } from 'vitest'
import { getWinner } from './board.ts'
import {
  applyMove,
  applyMoves,
  generateMoveSequences,
  generateSingleMoves,
  hasLegalMoves,
  isLegalSequence,
} from './moves.ts'
import { buildState } from './testHelpers.ts'

describe('single moves', () => {
  it('moves white down the numbering and black up it', () => {
    expect(generateSingleMoves(buildState({ white: { 13: 1 }, dice: [5] }), 5)).toEqual([
      { from: 13, to: 8, die: 5, hit: false },
    ])
    expect(
      generateSingleMoves(buildState({ black: { 12: 1 }, turn: 'black', dice: [5] }), 5),
    ).toEqual([{ from: 12, to: 17, die: 5, hit: false }])
  })

  it('cannot land on a point held by two or more opposing checkers', () => {
    const state = buildState({ white: { 13: 1 }, black: { 12: 2 }, dice: [1] })
    expect(generateSingleMoves(state, 1)).toEqual([])
    expect(hasLegalMoves(state)).toBe(false)
  })

  it('hits a lone opposing checker and sends it to the bar', () => {
    const state = buildState({ white: { 13: 1 }, black: { 12: 1 }, dice: [1] })
    const [move] = generateSingleMoves(state, 1)
    expect(move).toEqual({ from: 13, to: 12, die: 1, hit: true })

    const next = applyMove(state, move)
    expect(next.bar.black).toBe(1)
    expect(next.points[11]).toEqual({ player: 'white', count: 1 })
    expect(next.dice).toEqual([])
  })

  it('stacks onto a point already held by the mover', () => {
    const state = buildState({ white: { 13: 2, 8: 1 }, dice: [5] })
    const next = applyMove(state, { from: 13, to: 8, die: 5, hit: false })
    expect(next.points[7]).toEqual({ player: 'white', count: 2 })
    expect(next.points[12]).toEqual({ player: 'white', count: 1 })
  })
})

describe('entering from the bar', () => {
  it('allows nothing but entering while a checker is on the bar', () => {
    const state = buildState({ white: { 13: 2 }, bar: { white: 1 }, dice: [3, 5] })
    expect(generateSingleMoves(state, 3)).toEqual([{ from: 'bar', to: 22, die: 3, hit: false }])
    expect(generateSingleMoves(state, 5)).toEqual([{ from: 'bar', to: 20, die: 5, hit: false }])
    for (const sequence of generateMoveSequences(state)) {
      expect(sequence.moves[0].from).toBe('bar')
    }
  })

  it('enters black checkers from the other end of the board', () => {
    const state = buildState({ black: { 12: 2 }, bar: { black: 1 }, turn: 'black', dice: [4] })
    expect(generateSingleMoves(state, 4)).toEqual([{ from: 'bar', to: 4, die: 4, hit: false }])
  })

  it('forfeits the turn when every entry point is blocked', () => {
    const state = buildState({
      white: { 13: 2 },
      black: { 22: 2, 20: 3 },
      bar: { white: 1 },
      dice: [3, 5],
    })
    expect(generateMoveSequences(state)).toEqual([])
  })

  it('plays only the die that enters when the other entry point is blocked', () => {
    const state = buildState({
      white: { 13: 2 },
      black: { 20: 2 },
      bar: { white: 2 },
      dice: [3, 5],
    })
    const sequences = generateMoveSequences(state)
    expect(sequences).toHaveLength(1)
    expect(sequences[0].moves).toEqual([{ from: 'bar', to: 22, die: 3, hit: false }])
    expect(sequences[0].result.bar.white).toBe(1)
  })

  it('hits a blot while entering from the bar', () => {
    const state = buildState({ black: { 22: 1 }, bar: { white: 1 }, dice: [3] })
    const [move] = generateSingleMoves(state, 3)
    expect(move.hit).toBe(true)
    const next = applyMove(state, move)
    expect(next.bar).toEqual({ white: 0, black: 1 })
    expect(next.points[21]).toEqual({ player: 'white', count: 1 })
  })
})

describe('using both dice', () => {
  it('requires both dice to be played when that is possible', () => {
    const sequences = generateMoveSequences(buildState({ white: { 13: 1 }, dice: [2, 1] }))
    expect(sequences).toHaveLength(1)
    expect(sequences[0].moves).toHaveLength(2)
    expect(sequences[0].result.points[9]).toEqual({ player: 'white', count: 1 })
  })

  it('rejects a one-move sequence when both dice are playable', () => {
    const state = buildState({ white: { 13: 1 }, dice: [2, 1] })
    expect(isLegalSequence(state, [{ from: 13, to: 11, die: 2, hit: false }])).toBe(false)
    expect(
      isLegalSequence(state, [
        { from: 13, to: 11, die: 2, hit: false },
        { from: 11, to: 10, die: 1, hit: false },
      ]),
    ).toBe(true)
  })

  it('accepts either order of the dice when both orders are legal', () => {
    const state = buildState({ white: { 13: 1 }, dice: [2, 1] })
    expect(
      isLegalSequence(state, [
        { from: 13, to: 11, die: 2, hit: false },
        { from: 11, to: 10, die: 1, hit: false },
      ]),
    ).toBe(true)
    expect(
      isLegalSequence(state, [
        { from: 13, to: 12, die: 1, hit: false },
        { from: 12, to: 10, die: 2, hit: false },
      ]),
    ).toBe(true)
  })

  it('rejects a sequence that reuses a die it does not have', () => {
    const state = buildState({ white: { 13: 1 }, dice: [2, 1] })
    expect(
      isLegalSequence(state, [
        { from: 13, to: 11, die: 2, hit: false },
        { from: 11, to: 9, die: 2, hit: false },
      ]),
    ).toBe(false)
  })

  it('rejects a sequence that misreports a hit', () => {
    const state = buildState({ white: { 13: 1 }, black: { 11: 1 }, dice: [2] })
    expect(isLegalSequence(state, [{ from: 13, to: 11, die: 2, hit: true }])).toBe(true)
    expect(isLegalSequence(state, [{ from: 13, to: 11, die: 2, hit: false }])).toBe(false)
  })

  it('plays the larger die when only one of the two can be played', () => {
    const state = buildState({ white: { 10: 1 }, black: { 2: 2 }, dice: [5, 3] })
    const sequences = generateMoveSequences(state)
    expect(sequences).toHaveLength(1)
    expect(sequences[0].moves).toEqual([{ from: 10, to: 5, die: 5, hit: false }])
  })

  it('plays the smaller die when the larger one cannot be played at all', () => {
    const state = buildState({ white: { 10: 1 }, black: { 4: 2, 1: 2 }, dice: [6, 3] })
    const sequences = generateMoveSequences(state)
    expect(sequences).toHaveLength(1)
    expect(sequences[0].moves).toEqual([{ from: 10, to: 7, die: 3, hit: false }])
  })

  it('returns no sequences when there are no dice left', () => {
    expect(generateMoveSequences(buildState({ white: { 13: 2 } }))).toEqual([])
  })
})

describe('doubles', () => {
  it('plays four moves when all of them are available', () => {
    const state = buildState({ white: { 13: 4 }, dice: [5, 5, 5, 5] })
    const sequences = generateMoveSequences(state)
    expect(sequences.every((sequence) => sequence.moves.length === 4)).toBe(true)
    expect(sequences.every((sequence) => sequence.result.dice.length === 0)).toBe(true)
    const allOnEight = sequences.find(
      (sequence) => sequence.result.points[7].count === 4 && sequence.result.points[12].count === 0,
    )
    expect(allOnEight).toBeDefined()
  })

  it('plays as many of the four as the position allows', () => {
    const state = buildState({ white: { 13: 1 }, black: { 3: 2 }, dice: [5, 5, 5, 5] })
    const sequences = generateMoveSequences(state)
    expect(sequences).toHaveLength(1)
    expect(sequences[0].moves).toEqual([{ from: 13, to: 8, die: 5, hit: false }])
  })
})

describe('bearing off', () => {
  it('is not allowed while a checker sits outside the home board', () => {
    const state = buildState({ white: { 7: 1, 3: 1 }, dice: [3] })
    expect(generateSingleMoves(state, 3)).toEqual([{ from: 7, to: 4, die: 3, hit: false }])
  })

  it('is not allowed while a checker sits on the bar', () => {
    const state = buildState({ white: { 3: 1 }, bar: { white: 1 }, dice: [3] })
    expect(generateSingleMoves(state, 3)).toEqual([{ from: 'bar', to: 22, die: 3, hit: false }])
  })

  it('bears off on an exact roll', () => {
    const state = buildState({ white: { 3: 1, 1: 1 }, dice: [3, 1] })
    const sequences = generateMoveSequences(state)
    expect(sequences.every((sequence) => sequence.moves.length === 2)).toBe(true)
    expect(sequences.map((sequence) => sequence.result.off.white)).toContain(2)
  })

  it('bears the highest checker off with a larger die', () => {
    const state = buildState({ white: { 4: 1, 2: 1 }, dice: [6, 2] })
    expect(generateSingleMoves(state, 6)).toEqual([{ from: 4, to: 'off', die: 6, hit: false }])
  })

  it('refuses a larger die from a point that is not the highest', () => {
    const state = buildState({ white: { 5: 1, 2: 1 }, dice: [6] })
    const moves = generateSingleMoves(state, 6)
    expect(moves).toEqual([{ from: 5, to: 'off', die: 6, hit: false }])
    expect(moves.some((move) => move.from === 2)).toBe(false)
  })

  it('bears black checkers off from its own home board', () => {
    const state = buildState({ black: { 21: 1, 23: 1 }, turn: 'black', dice: [6, 2] })
    expect(generateSingleMoves(state, 6)).toEqual([{ from: 21, to: 'off', die: 6, hit: false }])
    expect(generateSingleMoves(state, 2)).toEqual([
      { from: 23, to: 'off', die: 2, hit: false },
      { from: 21, to: 23, die: 2, hit: false },
    ])
  })

  it('wins the game when the fifteenth checker comes off', () => {
    const state = buildState({ white: { 1: 1 }, off: { white: 14 }, dice: [1] })
    const next = applyMoves(state, [{ from: 1, to: 'off', die: 1, hit: false }])
    expect(next.off.white).toBe(15)
    expect(getWinner(next)).toBe('white')
  })
})
