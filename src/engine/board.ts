import type { GameState, Player, Point } from './types.ts'
import { CHECKERS_PER_PLAYER, POINT_COUNT, opponentOf } from './types.ts'

/** Distance from the bar to the bear-off tray, for either player. */
export const BAR_DISTANCE = 25

export function emptyPoints(): Point[] {
  return Array.from({ length: POINT_COUNT }, () => ({ player: null, count: 0 }))
}

/**
 * Standard starting position, described in the numbering White moves down
 * through (24 -> 1). Black moves the opposite way (1 -> 24).
 */
export function startingPoints(): Point[] {
  const points = emptyPoints()
  const place = (pointNumber: number, player: Player, count: number) => {
    points[pointNumber - 1] = { player, count }
  }
  place(24, 'white', 2)
  place(13, 'white', 5)
  place(8, 'white', 3)
  place(6, 'white', 5)
  place(1, 'black', 2)
  place(12, 'black', 5)
  place(17, 'black', 3)
  place(19, 'black', 5)
  return points
}

export function createInitialState(turn: Player = 'white', dice: number[] = []): GameState {
  return {
    points: startingPoints(),
    bar: { white: 0, black: 0 },
    off: { white: 0, black: 0 },
    turn,
    dice: [...dice],
  }
}

export function cloneState(state: GameState): GameState {
  return {
    points: state.points.map((point) => ({ ...point })),
    bar: { ...state.bar },
    off: { ...state.off },
    turn: state.turn,
    dice: [...state.dice],
  }
}

/** Pips a checker on `pointNumber` still needs to travel to bear off. */
export function distanceFromPoint(player: Player, pointNumber: number): number {
  return player === 'white' ? pointNumber : BAR_DISTANCE - pointNumber
}

/** Inverse of {@link distanceFromPoint}. */
export function pointFromDistance(player: Player, distance: number): number {
  return player === 'white' ? distance : BAR_DISTANCE - distance
}

export function pointAt(state: GameState, pointNumber: number): Point {
  return state.points[pointNumber - 1]
}

export function isBlockedFor(state: GameState, player: Player, pointNumber: number): boolean {
  const point = pointAt(state, pointNumber)
  return point.player === opponentOf(player) && point.count >= 2
}

export function isHitFor(state: GameState, player: Player, pointNumber: number): boolean {
  const point = pointAt(state, pointNumber)
  return point.player === opponentOf(player) && point.count === 1
}

/** Point numbers holding at least one checker of `player`, nearest to home first. */
export function occupiedPoints(state: GameState, player: Player): number[] {
  const numbers: number[] = []
  for (let pointNumber = 1; pointNumber <= POINT_COUNT; pointNumber += 1) {
    const point = state.points[pointNumber - 1]
    if (point.player === player && point.count > 0) numbers.push(pointNumber)
  }
  return numbers
}

/** All 15 checkers are in the home board (nothing on the bar, nothing outside). */
export function canBearOff(state: GameState, player: Player): boolean {
  if (state.bar[player] > 0) return false
  return occupiedPoints(state, player).every(
    (pointNumber) => distanceFromPoint(player, pointNumber) <= 6,
  )
}

/** Largest distance-to-off among the player's checkers on the board, 0 if none. */
export function highestOccupiedDistance(state: GameState, player: Player): number {
  return occupiedPoints(state, player).reduce(
    (highest, pointNumber) => Math.max(highest, distanceFromPoint(player, pointNumber)),
    0,
  )
}

export function getWinner(state: GameState): Player | null {
  if (state.off.white >= CHECKERS_PER_PLAYER) return 'white'
  if (state.off.black >= CHECKERS_PER_PLAYER) return 'black'
  return null
}

export function checkerCount(state: GameState, player: Player): number {
  const onBoard = state.points.reduce(
    (total, point) => (point.player === player ? total + point.count : total),
    0,
  )
  return onBoard + state.bar[player] + state.off[player]
}
