import {
  applyMove,
  generateMoveSequences,
  generateSingleMoves,
  maxPlayableDice,
} from '../engine/index.ts'
import type { GameState, Move, MoveSequence, MoveSource, MoveTarget, Player } from '../engine/index.ts'

/**
 * Legal sequences for the remaining dice, plus the first moves the player may
 * make right now. The engine deduplicates sequences by final position, so a
 * first move is accepted when it can still be completed into a maximal turn,
 * not only when it literally begins one of the reported sequences.
 */
export interface TurnOptions {
  sequences: MoveSequence[]
  firstMoves: Move[]
}

export function turnOptions(state: GameState): TurnOptions {
  const sequences = generateMoveSequences(state)
  if (sequences.length === 0) return { sequences, firstMoves: [] }

  const targetLength = sequences[0].moves.length
  const distinctDice = [...new Set(state.dice)].sort((a, b) => b - a)
  const largest = distinctDice[0]
  const largestPlayable =
    targetLength === 1 && distinctDice.length > 1 && generateSingleMoves(state, largest).length > 0

  const firstMoves: Move[] = []
  for (const die of distinctDice) {
    if (largestPlayable && die !== largest) continue
    for (const move of generateSingleMoves(state, die)) {
      if (1 + maxPlayableDice(applyMove(state, move)) === targetLength) firstMoves.push(move)
    }
  }
  return { sequences, firstMoves }
}

export function movesFrom(moves: Move[], from: MoveSource): Move[] {
  return moves.filter((move) => move.from === from)
}

/** Picks the move to play when the user clicks `to` from `from`; prefers the smaller die. */
export function pickMove(moves: Move[], from: MoveSource, to: MoveTarget): Move | undefined {
  return movesFrom(moves, from)
    .filter((move) => move.to === to)
    .sort((a, b) => a.die - b.die)[0]
}

function notationPoint(player: Player, target: MoveSource | MoveTarget): string {
  if (target === 'bar' || target === 'off') return target
  return String(player === 'white' ? target : 25 - target)
}

function formatMove(player: Player, move: Move): string {
  return `${notationPoint(player, move.from)}/${notationPoint(player, move.to)}${move.hit ? '*' : ''}`
}

export function playerName(player: Player): string {
  return player === 'white' ? 'White' : 'Black'
}

/** "White 3-1: 8/5 6/5", with "(no move)" for a forfeited turn. */
export function formatTurn(player: Player, roll: number[], moves: Move[]): string {
  const dice = roll.length > 2 ? `${roll[0]}-${roll[0]}` : [...roll].sort((a, b) => b - a).join('-')
  const played = moves.length === 0 ? '(no move)' : moves.map((m) => formatMove(player, m)).join(' ')
  return `${playerName(player)} ${dice}: ${played}`
}
