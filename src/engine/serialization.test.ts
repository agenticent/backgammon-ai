import { describe, expect, it } from 'vitest'
import { createInitialState } from './board.ts'
import {
  InvalidGameStateError,
  deserializeGameState,
  serializeGameState,
} from './serialization.ts'

describe('serialization', () => {
  it('round-trips a game state through JSON', () => {
    const state = createInitialState('black', [6, 3])
    expect(deserializeGameState(serializeGameState(state))).toEqual(state)
  })

  it('keeps the bar, the tray, the turn and the dice', () => {
    const state = createInitialState()
    state.points[23] = { player: 'white', count: 1 }
    state.bar.white = 1
    state.points[0] = { player: 'black', count: 1 }
    state.off.black = 1
    state.turn = 'black'
    state.dice = [2, 2, 2, 2]

    const restored = deserializeGameState(serializeGameState(state))
    expect(restored.bar).toEqual({ white: 1, black: 0 })
    expect(restored.off).toEqual({ white: 0, black: 1 })
    expect(restored.turn).toBe('black')
    expect(restored.dice).toEqual([2, 2, 2, 2])
  })

  it('produces JSON that other tools can read', () => {
    const parsed = JSON.parse(serializeGameState(createInitialState('white', [1])))
    expect(parsed.points).toHaveLength(24)
    expect(parsed.points[23]).toEqual({ player: 'white', count: 2 })
    expect(parsed.turn).toBe('white')
  })

  it('rejects malformed JSON', () => {
    expect(() => deserializeGameState('{')).toThrow(InvalidGameStateError)
  })

  it('rejects a state without twenty-four points', () => {
    expect(() => deserializeGameState(JSON.stringify({ points: [] }))).toThrow(
      /24 points/,
    )
  })

  it('rejects an unknown player on turn', () => {
    const json = JSON.parse(serializeGameState(createInitialState()))
    json.turn = 'green'
    expect(() => deserializeGameState(JSON.stringify(json))).toThrow(/invalid turn/)
  })

  it('rejects dice outside one to six', () => {
    const json = JSON.parse(serializeGameState(createInitialState()))
    json.dice = [7]
    expect(() => deserializeGameState(JSON.stringify(json))).toThrow(/invalid dice/)
  })

  it('rejects a position that does not hold fifteen checkers per player', () => {
    const json = JSON.parse(serializeGameState(createInitialState()))
    json.points[23] = { player: 'white', count: 1 }
    expect(() => deserializeGameState(JSON.stringify(json))).toThrow(/15 checkers/)
  })

  it('rejects an owned point with no checkers on it', () => {
    const json = JSON.parse(serializeGameState(createInitialState()))
    json.points[2] = { player: 'white', count: 0 }
    expect(() => deserializeGameState(JSON.stringify(json))).toThrow(/empty but owned/)
  })
})
