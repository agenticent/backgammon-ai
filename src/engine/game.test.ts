import { describe, expect, it } from 'vitest'
import {
  IllegalMoveError,
  endTurn,
  isGameOver,
  isTurnForfeited,
  playMoveSequence,
  rollForTurn,
  startGame,
  winner,
} from './game.ts'
import { buildState, diceRng } from './testHelpers.ts'

describe('game flow', () => {
  it('starts from the standard position with the opening roll', () => {
    const state = startGame(diceRng([2, 5]))
    expect(state.turn).toBe('black')
    expect(state.dice).toEqual([5, 2])
    expect(state.points[23]).toEqual({ player: 'white', count: 2 })
  })

  it('rolls four dice for the player on turn when doubling up', () => {
    const state = rollForTurn(buildState({ white: { 13: 2 } }), diceRng([4, 4]))
    expect(state.dice).toEqual([4, 4, 4, 4])
  })

  it('passes the turn and clears the dice', () => {
    const state = endTurn(buildState({ white: { 13: 2 }, dice: [3, 1] }))
    expect(state.turn).toBe('black')
    expect(state.dice).toEqual([])
  })

  it('applies a legal sequence and leaves the original state untouched', () => {
    const state = buildState({ white: { 13: 1 }, dice: [3, 1] })
    const next = playMoveSequence(state, [
      { from: 13, to: 10, die: 3, hit: false },
      { from: 10, to: 9, die: 1, hit: false },
    ])
    expect(next.points[8]).toEqual({ player: 'white', count: 1 })
    expect(next.dice).toEqual([])
    expect(state.points[12]).toEqual({ player: 'white', count: 1 })
    expect(state.dice).toEqual([3, 1])
  })

  it('refuses an illegal sequence', () => {
    const state = buildState({ white: { 13: 1 }, black: { 12: 2 }, dice: [1, 3] })
    expect(() => playMoveSequence(state, [{ from: 13, to: 12, die: 1, hit: false }])).toThrow(
      IllegalMoveError,
    )
  })

  it('reports a forfeited turn when no die can be played', () => {
    const state = buildState({
      white: { 13: 2 },
      black: { 22: 2, 20: 2 },
      bar: { white: 1 },
      dice: [3, 5],
    })
    expect(isTurnForfeited(state)).toBe(true)
    expect(isTurnForfeited(endTurn(state))).toBe(false)
  })

  it('reports the winner once all fifteen checkers are off', () => {
    const won = buildState({ off: { white: 15 } })
    expect(isGameOver(won)).toBe(true)
    expect(winner(won)).toBe('white')
    expect(isGameOver(buildState({ off: { white: 14, black: 3 } }))).toBe(false)
  })
})
