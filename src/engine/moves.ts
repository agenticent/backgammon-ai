import {
  BAR_DISTANCE,
  canBearOff,
  cloneState,
  distanceFromPoint,
  highestOccupiedDistance,
  isBlockedFor,
  isHitFor,
  occupiedPoints,
  pointFromDistance,
} from './board.ts'
import type { GameState, Move, MoveSequence } from './types.ts'
import { opponentOf } from './types.ts'

function uniqueDice(dice: number[]): number[] {
  return [...new Set(dice)].sort((a, b) => b - a)
}

/** Every legal move the player on turn can make with a single die. */
export function generateSingleMoves(state: GameState, die: number): Move[] {
  const player = state.turn
  if (state.bar[player] > 0) {
    const entryPoint = pointFromDistance(player, BAR_DISTANCE - die)
    if (isBlockedFor(state, player, entryPoint)) return []
    return [{ from: 'bar', to: entryPoint, die, hit: isHitFor(state, player, entryPoint) }]
  }

  const moves: Move[] = []
  const bearingOff = canBearOff(state, player)
  const highest = highestOccupiedDistance(state, player)
  for (const from of occupiedPoints(state, player)) {
    const distance = distanceFromPoint(player, from)
    const remaining = distance - die
    if (remaining > 0) {
      const to = pointFromDistance(player, remaining)
      if (!isBlockedFor(state, player, to)) {
        moves.push({ from, to, die, hit: isHitFor(state, player, to) })
      }
      continue
    }
    if (!bearingOff) continue
    // An exact roll always bears off; a larger roll only from the highest point.
    if (remaining === 0 || distance === highest) {
      moves.push({ from, to: 'off', die, hit: false })
    }
  }
  return moves
}

/** Applies one move, removing the die it consumed from the remaining dice. */
export function applyMove(state: GameState, move: Move): GameState {
  const next = cloneState(state)
  const player = next.turn
  const opponent = opponentOf(player)

  if (move.from === 'bar') {
    next.bar[player] -= 1
  } else {
    const source = next.points[move.from - 1]
    source.count -= 1
    if (source.count === 0) source.player = null
  }

  if (move.to === 'off') {
    next.off[player] += 1
  } else {
    const target = next.points[move.to - 1]
    if (target.player === opponent) {
      next.bar[opponent] += target.count
      target.player = null
      target.count = 0
    }
    target.player = player
    target.count += 1
  }

  const dieIndex = next.dice.indexOf(move.die)
  if (dieIndex >= 0) next.dice.splice(dieIndex, 1)
  return next
}

export function applyMoves(state: GameState, moves: Move[]): GameState {
  return moves.reduce(applyMove, state)
}

function positionKey(state: GameState): string {
  const points = state.points
    .map((point) => `${point.player === null ? '.' : point.player[0]}${point.count}`)
    .join('|')
  return `${points}/${state.bar.white},${state.bar.black}/${state.off.white},${state.off.black}`
}

function explore(state: GameState, sequence: Move[], out: MoveSequence[]): void {
  let extended = false
  for (const die of uniqueDice(state.dice)) {
    for (const move of generateSingleMoves(state, die)) {
      extended = true
      explore(applyMove(state, move), [...sequence, move], out)
    }
  }
  if (!extended && sequence.length > 0) out.push({ moves: sequence, result: state })
}

/**
 * Every legal way to play the remaining dice, already filtered by the
 * "play as many dice as possible" rule and, when only one die can be played,
 * the "play the larger die" rule. Sequences reaching the same position are
 * reported once.
 */
export function generateMoveSequences(state: GameState): MoveSequence[] {
  if (state.dice.length === 0) return []

  const candidates: MoveSequence[] = []
  explore(state, [], candidates)
  if (candidates.length === 0) return []

  const maxLength = candidates.reduce((max, candidate) => Math.max(max, candidate.moves.length), 0)
  let best = candidates.filter((candidate) => candidate.moves.length === maxLength)

  const distinctDice = uniqueDice(state.dice)
  if (maxLength === 1 && distinctDice.length > 1) {
    const largest = distinctDice[0]
    const withLargest = best.filter((candidate) => candidate.moves[0].die === largest)
    if (withLargest.length > 0) best = withLargest
  }

  const seen = new Set<string>()
  return best.filter((candidate) => {
    const key = positionKey(candidate.result)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export function hasLegalMoves(state: GameState): boolean {
  return generateMoveSequences(state).length > 0
}

/** True when `moves` is exactly one of the legal sequences for the position. */
export function isLegalSequence(state: GameState, moves: Move[]): boolean {
  return generateMoveSequences(state).some(
    (candidate) =>
      candidate.moves.length === moves.length &&
      candidate.moves.every((move, index) => {
        const other = moves[index]
        return move.from === other.from && move.to === other.to && move.die === other.die
      }),
  )
}
