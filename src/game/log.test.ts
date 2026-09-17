import { describe, expect, it } from 'vitest'
import { groupTurns } from './log.ts'

describe('groupTurns', () => {
  it('keeps a black-first opening in its own row', () => {
    expect(groupTurns([{ player: 'black', notation: '3-1: 24/21 13/12' }])).toEqual([
      { white: null, black: '3-1: 24/21 13/12' },
    ])
  })

  it('pairs alternating white and black turns with newest rows first', () => {
    expect(
      groupTurns([
        { player: 'white', notation: 'A' },
        { player: 'black', notation: 'B' },
        { player: 'white', notation: 'C' },
        { player: 'black', notation: 'D' },
      ]),
    ).toEqual([
      { white: 'C', black: 'D' },
      { white: 'A', black: 'B' },
    ])
  })

  it('does not overwrite consecutive same-player entries', () => {
    expect(
      groupTurns([
        { player: 'white', notation: 'A' },
        { player: 'white', notation: 'B' },
        { player: 'black', notation: 'C' },
        { player: 'black', notation: 'D' },
      ]),
    ).toEqual([
      { white: null, black: 'D' },
      { white: 'B', black: 'C' },
      { white: 'A', black: null },
    ])
  })
})
