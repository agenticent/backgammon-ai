import { describe, expect, it } from 'vitest'
import { diceForRoll, isDoubles, openingRoll, rollDice, rollDie } from './dice.ts'
import { diceRng } from './testHelpers.ts'

describe('dice', () => {
  it('rolls values between one and six', () => {
    expect(rollDie(() => 0)).toBe(1)
    expect(rollDie(() => 0.999999)).toBe(6)
    for (let i = 0; i < 200; i += 1) {
      const die = rollDie()
      expect(die).toBeGreaterThanOrEqual(1)
      expect(die).toBeLessThanOrEqual(6)
    }
  })

  it('rolls two dice', () => {
    expect(rollDice(diceRng([3, 5]))).toEqual([3, 5])
  })

  it('recognises doubles', () => {
    expect(isDoubles([4, 4])).toBe(true)
    expect(isDoubles([4, 2])).toBe(false)
  })

  it('gives four moves for doubles and two otherwise', () => {
    expect(diceForRoll([4, 4])).toEqual([4, 4, 4, 4])
    expect(diceForRoll([6, 1])).toEqual([6, 1])
  })

  it('gives the opening turn to the higher single die', () => {
    const roll = openingRoll(diceRng([6, 2]))
    expect(roll).toEqual({ white: 6, black: 2, first: 'white', dice: [6, 2], rerolls: 0 })
  })

  it('gives the opening turn to black when black rolls higher', () => {
    expect(openingRoll(diceRng([1, 4])).first).toBe('black')
  })

  it('rerolls the opening roll on a tie', () => {
    const roll = openingRoll(diceRng([3, 3, 5, 5, 2, 6]))
    expect(roll.rerolls).toBe(2)
    expect(roll.first).toBe('black')
    expect(roll.dice).toEqual([6, 2])
  })
})
