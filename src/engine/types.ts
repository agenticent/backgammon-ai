export type Player = 'white' | 'black'

/** A single point on the board. `player` is null exactly when `count` is 0. */
export interface Point {
  player: Player | null
  count: number
}

/** Source of a checker: a point number (1-24) or the bar. */
export type MoveSource = number | 'bar'

/** Destination of a checker: a point number (1-24) or the bear-off tray. */
export type MoveTarget = number | 'off'

export interface Move {
  from: MoveSource
  to: MoveTarget
  die: number
  /** True when the move hits a lone opposing checker and sends it to the bar. */
  hit: boolean
}

/** A complete, legal way to play the remaining dice for a turn. */
export interface MoveSequence {
  moves: Move[]
  /** State after applying every move in the sequence. */
  result: GameState
}

export interface GameState {
  /** 24 points, index 0 is point 1 and index 23 is point 24. */
  points: Point[]
  bar: Record<Player, number>
  off: Record<Player, number>
  turn: Player
  /** Dice values still available to the player on turn. */
  dice: number[]
}

export const CHECKERS_PER_PLAYER = 15
export const POINT_COUNT = 24

export function opponentOf(player: Player): Player {
  return player === 'white' ? 'black' : 'white'
}
