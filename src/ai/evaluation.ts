import {
  BAR_DISTANCE,
  distanceFromPoint,
  occupiedPoints,
  opponentOf,
  pointFromDistance,
} from '../engine/index.ts'
import type { GameState, Player } from '../engine/index.ts'

export interface EvaluationWeights {
  pipDifference: number
  blotExposure: number
  homeBoardPoints: number
  opponentOnBar: number
  borneOff: number
  longestPrime: number
}

export const DEFAULT_WEIGHTS: EvaluationWeights = {
  pipDifference: 1,
  blotExposure: 12,
  homeBoardPoints: 4,
  opponentOnBar: 10,
  borneOff: 6,
  longestPrime: 3,
}

export function pipCount(state: GameState, player: Player): number {
  const boardPips = occupiedPoints(state, player).reduce(
    (total, pointNumber) =>
      total + state.points[pointNumber - 1].count * distanceFromPoint(player, pointNumber),
    0,
  )
  return boardPips + state.bar[player] * BAR_DISTANCE
}

function isBlockedAtDistance(state: GameState, player: Player, distance: number): boolean {
  const point = state.points[pointFromDistance(player, distance) - 1]
  return point.player === player && point.count >= 2
}

function canHitWithRoll(
  state: GameState,
  player: Player,
  sourceDistance: number,
  targetDistance: number,
  d1: number,
  d2: number,
): boolean {
  const distance = sourceDistance - targetDistance
  if (distance <= 0) return false
  if (distance === d1 || distance === d2) return true

  if (distance === d1 + d2) {
    return (
      !isBlockedAtDistance(state, player, sourceDistance - d1) ||
      !isBlockedAtDistance(state, player, sourceDistance - d2)
    )
  }

  if (d1 !== d2) return false
  const d = d1
  if (distance !== 3 * d && distance !== 4 * d) return false
  const intermediateCount = distance / d - 1
  for (let step = 1; step <= intermediateCount; step += 1) {
    if (isBlockedAtDistance(state, player, sourceDistance - step * d)) return false
  }
  return true
}

// This estimates shots directly rather than using the engine's move generator.
export function blotExposure(state: GameState, player: Player): number {
  const opponent = opponentOf(player)
  let exposure = 0

  for (const pointNumber of occupiedPoints(state, player)) {
    if (state.points[pointNumber - 1].count !== 1) continue
    const targetDistance = distanceFromPoint(opponent, pointNumber)
    const sources = occupiedPoints(state, opponent).map((source) => ({
      distance: distanceFromPoint(opponent, source),
    }))
    if (state.bar[opponent] > 0) sources.push({ distance: BAR_DISTANCE })

    let hittingRolls = 0
    for (let d1 = 1; d1 <= 6; d1 += 1) {
      for (let d2 = 1; d2 <= 6; d2 += 1) {
        if (
          sources.some((source) =>
            canHitWithRoll(state, player, source.distance, targetDistance, d1, d2),
          )
        ) {
          hittingRolls += 1
        }
      }
    }
    exposure += hittingRolls / 36
  }

  return exposure
}

function longestPrime(state: GameState, player: Player): number {
  let longest = 0
  let current = 0
  for (let distance = 1; distance <= 24; distance += 1) {
    const point = state.points[pointFromDistance(player, distance) - 1]
    if (point.player === player && point.count >= 2) {
      current += 1
      longest = Math.max(longest, current)
    } else {
      current = 0
    }
  }
  return longest
}

export function evaluatePosition(
  state: GameState,
  player: Player,
  weights: EvaluationWeights = DEFAULT_WEIGHTS,
): number {
  const opponent = opponentOf(player)
  const ownPips = pipCount(state, player)
  const opponentPips = pipCount(state, opponent)
  const homeBoardPoints = occupiedPoints(state, player).filter(
    (pointNumber) =>
      distanceFromPoint(player, pointNumber) <= 6 && state.points[pointNumber - 1].count >= 2,
  ).length

  return (
    weights.pipDifference * (opponentPips - ownPips) -
    weights.blotExposure * blotExposure(state, player) +
    weights.homeBoardPoints * homeBoardPoints +
    weights.opponentOnBar * state.bar[opponent] +
    weights.borneOff * state.off[player] +
    weights.longestPrime * longestPrime(state, player)
  )
}
