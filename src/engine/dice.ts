import type { Player } from './types.ts'

/** Returns a number in [0, 1), like `Math.random`. */
export type Rng = () => number

export type DiceRoll = [number, number]

export interface OpeningRoll {
  white: number
  black: number
  first: Player
  /** The two die values the first player must use, higher first. */
  dice: number[]
  /** Number of ties rerolled before a winner emerged. */
  rerolls: number
}

export function rollDie(rng: Rng = Math.random): number {
  return Math.floor(rng() * 6) + 1
}

export function rollDice(rng: Rng = Math.random): DiceRoll {
  return [rollDie(rng), rollDie(rng)]
}

export function isDoubles(roll: DiceRoll): boolean {
  return roll[0] === roll[1]
}

/** Dice available for a turn: doubles are played four times. */
export function diceForRoll(roll: DiceRoll): number[] {
  return isDoubles(roll) ? [roll[0], roll[0], roll[0], roll[0]] : [roll[0], roll[1]]
}

/**
 * Each player rolls a single die; the higher roll moves first and plays both
 * values. Ties are rerolled.
 */
export function openingRoll(rng: Rng = Math.random): OpeningRoll {
  let rerolls = 0
  for (;;) {
    const white = rollDie(rng)
    const black = rollDie(rng)
    if (white === black) {
      rerolls += 1
      continue
    }
    return {
      white,
      black,
      first: white > black ? 'white' : 'black',
      dice: [Math.max(white, black), Math.min(white, black)],
      rerolls,
    }
  }
}
