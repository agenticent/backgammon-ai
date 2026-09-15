import { describe, expect, it } from 'vitest'
import {
  canBearOff,
  checkerCount,
  createInitialState,
  distanceFromPoint,
  getWinner,
  highestOccupiedDistance,
  isBlockedFor,
  isHitFor,
  occupiedPoints,
  pointFromDistance,
  startingPoints,
} from './board.ts'
import { buildState } from './testHelpers.ts'

describe('board', () => {
  it('starts with fifteen checkers for each player', () => {
    const state = createInitialState()
    expect(checkerCount(state, 'white')).toBe(15)
    expect(checkerCount(state, 'black')).toBe(15)
  })

  it('uses the standard starting position', () => {
    const points = startingPoints()
    const owned = points
      .map((point, index) => ({ point: index + 1, ...point }))
      .filter((entry) => entry.count > 0)
    expect(owned).toEqual([
      { point: 1, player: 'black', count: 2 },
      { point: 6, player: 'white', count: 5 },
      { point: 8, player: 'white', count: 3 },
      { point: 12, player: 'black', count: 5 },
      { point: 13, player: 'white', count: 5 },
      { point: 17, player: 'black', count: 3 },
      { point: 19, player: 'black', count: 5 },
      { point: 24, player: 'white', count: 2 },
    ])
  })

  it('measures distance to the bear-off tray per direction of travel', () => {
    expect(distanceFromPoint('white', 24)).toBe(24)
    expect(distanceFromPoint('white', 1)).toBe(1)
    expect(distanceFromPoint('black', 1)).toBe(24)
    expect(distanceFromPoint('black', 24)).toBe(1)
  })

  it('converts distances back to point numbers', () => {
    for (let point = 1; point <= 24; point += 1) {
      expect(pointFromDistance('white', distanceFromPoint('white', point))).toBe(point)
      expect(pointFromDistance('black', distanceFromPoint('black', point))).toBe(point)
    }
  })

  it('treats a point with two or more opposing checkers as blocked', () => {
    const state = buildState({ black: { 5: 2, 4: 1 } })
    expect(isBlockedFor(state, 'white', 5)).toBe(true)
    expect(isBlockedFor(state, 'white', 4)).toBe(false)
    expect(isHitFor(state, 'white', 4)).toBe(true)
    expect(isHitFor(state, 'white', 5)).toBe(false)
  })

  it('does not allow bearing off while checkers are outside the home board', () => {
    const state = buildState({ white: { 6: 14, 7: 1 } })
    expect(canBearOff(state, 'white')).toBe(false)
  })

  it('does not allow bearing off while a checker is on the bar', () => {
    const state = buildState({ white: { 6: 14 }, bar: { white: 1 } })
    expect(canBearOff(state, 'white')).toBe(false)
  })

  it('allows bearing off once every checker is home', () => {
    expect(canBearOff(buildState({ white: { 6: 10, 1: 5 } }), 'white')).toBe(true)
    expect(canBearOff(buildState({ black: { 19: 10, 24: 5 } }), 'black')).toBe(true)
  })

  it('reports the highest occupied point as a distance from home', () => {
    expect(highestOccupiedDistance(buildState({ white: { 4: 2, 2: 3 } }), 'white')).toBe(4)
    expect(highestOccupiedDistance(buildState({ black: { 21: 2, 23: 3 } }), 'black')).toBe(4)
    expect(occupiedPoints(buildState({ white: { 4: 2, 2: 3 } }), 'white')).toEqual([2, 4])
  })

  it('detects a winner only once fifteen checkers are borne off', () => {
    expect(getWinner(createInitialState())).toBeNull()
    expect(getWinner(buildState({ off: { white: 14 } }))).toBeNull()
    expect(getWinner(buildState({ off: { white: 15 } }))).toBe('white')
    expect(getWinner(buildState({ off: { black: 15 } }))).toBe('black')
  })
})
