import { checkerCount } from './board.ts'
import type { GameState, Player, Point } from './types.ts'
import { CHECKERS_PER_PLAYER, POINT_COUNT } from './types.ts'

export class InvalidGameStateError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InvalidGameStateError'
  }
}

function isPlayer(value: unknown): value is Player {
  return value === 'white' || value === 'black'
}

function parsePoint(value: unknown, index: number): Point {
  if (typeof value !== 'object' || value === null) {
    throw new InvalidGameStateError(`point ${index + 1} is not an object`)
  }
  const { player, count } = value as { player?: unknown; count?: unknown }
  if (typeof count !== 'number' || !Number.isInteger(count) || count < 0) {
    throw new InvalidGameStateError(`point ${index + 1} has an invalid count`)
  }
  if (count === 0) {
    if (player !== null && player !== undefined) {
      throw new InvalidGameStateError(`point ${index + 1} is empty but owned`)
    }
    return { player: null, count: 0 }
  }
  if (!isPlayer(player)) {
    throw new InvalidGameStateError(`point ${index + 1} has an invalid owner`)
  }
  return { player, count }
}

function parseCounts(value: unknown, field: string): Record<Player, number> {
  if (typeof value !== 'object' || value === null) {
    throw new InvalidGameStateError(`${field} is not an object`)
  }
  const { white, black } = value as { white?: unknown; black?: unknown }
  for (const count of [white, black]) {
    if (typeof count !== 'number' || !Number.isInteger(count) || count < 0) {
      throw new InvalidGameStateError(`${field} has an invalid count`)
    }
  }
  return { white: white as number, black: black as number }
}

export function serializeGameState(state: GameState): string {
  return JSON.stringify({
    points: state.points.map((point) => ({ player: point.player, count: point.count })),
    bar: state.bar,
    off: state.off,
    turn: state.turn,
    dice: state.dice,
  })
}

export function deserializeGameState(json: string): GameState {
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch {
    throw new InvalidGameStateError('game state is not valid JSON')
  }
  if (typeof parsed !== 'object' || parsed === null) {
    throw new InvalidGameStateError('game state is not an object')
  }
  const { points, bar, off, turn, dice } = parsed as Record<string, unknown>

  if (!Array.isArray(points) || points.length !== POINT_COUNT) {
    throw new InvalidGameStateError(`game state must have ${POINT_COUNT} points`)
  }
  if (!isPlayer(turn)) throw new InvalidGameStateError('game state has an invalid turn')
  if (
    !Array.isArray(dice) ||
    dice.some((die) => typeof die !== 'number' || !Number.isInteger(die) || die < 1 || die > 6)
  ) {
    throw new InvalidGameStateError('game state has invalid dice')
  }

  const state: GameState = {
    points: points.map(parsePoint),
    bar: parseCounts(bar, 'bar'),
    off: parseCounts(off, 'off'),
    turn,
    dice: dice as number[],
  }

  for (const player of ['white', 'black'] as const) {
    if (checkerCount(state, player) !== CHECKERS_PER_PLAYER) {
      throw new InvalidGameStateError(`${player} does not have ${CHECKERS_PER_PLAYER} checkers`)
    }
  }
  return state
}
