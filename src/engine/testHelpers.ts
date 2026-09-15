import { emptyPoints } from './board.ts'
import type { Rng } from './dice.ts'
import type { GameState, Player } from './types.ts'

export interface StateSpec {
  white?: Record<number, number>
  black?: Record<number, number>
  bar?: Partial<Record<Player, number>>
  off?: Partial<Record<Player, number>>
  turn?: Player
  dice?: number[]
}

/** Builds an arbitrary position for tests; checker counts are not validated. */
export function buildState(spec: StateSpec): GameState {
  const points = emptyPoints()
  const place = (player: Player, checkers: Record<number, number>) => {
    for (const [pointNumber, count] of Object.entries(checkers)) {
      points[Number(pointNumber) - 1] = { player, count }
    }
  }
  place('white', spec.white ?? {})
  place('black', spec.black ?? {})
  return {
    points,
    bar: { white: 0, black: 0, ...spec.bar },
    off: { white: 0, black: 0, ...spec.off },
    turn: spec.turn ?? 'white',
    dice: spec.dice ?? [],
  }
}

/** Deterministic RNG that yields exactly the given die values, then repeats. */
export function diceRng(values: number[]): Rng {
  let index = 0
  return () => {
    const value = values[index % values.length]
    index += 1
    return (value - 1) / 6
  }
}
