import { describe, expect, it } from 'vitest'
import { applyMoves, createInitialState } from '../engine/index.ts'
import { buildState } from '../engine/testHelpers.ts'
import {
  evaluatePosition,
  pipCount,
  blotExposure,
  type EvaluationWeights,
} from './evaluation.ts'

describe('evaluation', () => {
  it('counts starting-position pips', () => {
    const state = createInitialState()
    expect(pipCount(state, 'white')).toBe(167)
    expect(pipCount(state, 'black')).toBe(167)
  })

  it('estimates the exposure of a blot', () => {
    const state = buildState({
      white: { 18: 1 },
      black: { 12: 1 },
    })
    expect(blotExposure(state, 'white')).toBeCloseTo(17 / 36)
  })

  it('counts the longest prime', () => {
    const state = buildState({
      white: { 1: 2, 2: 3, 3: 2, 5: 2, 6: 2 },
    })
    const weights: EvaluationWeights = {
      pipDifference: 0,
      blotExposure: 0,
      homeBoardPoints: 0,
      opponentOnBar: 0,
      borneOff: 0,
      longestPrime: 1,
    }
    expect(evaluatePosition(state, 'white', weights)).toBe(3)
  })

  it('rewards hitting an exposed checker', () => {
    const state = buildState({
      white: { 6: 1 },
      black: { 3: 1 },
      turn: 'white',
      dice: [3],
    })
    const hit = applyMoves(state, [{ from: 6, to: 3, die: 3, hit: true }])
    expect(evaluatePosition(hit, 'white')).toBeGreaterThan(evaluatePosition(state, 'white'))
  })
})
