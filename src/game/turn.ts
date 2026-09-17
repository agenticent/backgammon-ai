import {
  applyMoves,
  generateMoveSequences,
  generateSingleMoves,
  isLegalSequence,
} from '../engine/index.ts'
import type { GameState, Move, MoveSequence, MoveSource, MoveTarget, Player } from '../engine/index.ts'
import type { TurnRecord } from './log.ts'

/**
 * Legal sequences for the remaining dice, plus first moves accepted by the
 * engine's `isLegalSequence` as the start of some complete turn.
 */
export interface TurnOptions {
  sequences: MoveSequence[]
  firstMoves: Move[]
}

export function turnOptions(state: GameState): TurnOptions {
  const sequences = generateMoveSequences(state)
  if (sequences.length === 0) return { sequences, firstMoves: [] }
  const firstMoves: Move[] = []
  for (const die of new Set(state.dice)) {
    for (const move of generateSingleMoves(state, die)) {
      if (beginsLegalTurn(state, move)) firstMoves.push(move)
    }
  }
  return { sequences, firstMoves }
}

/** True when `moves` (already played from `start`) can still be extended into a turn the engine accepts. */
export function canCompleteTurn(start: GameState, moves: Move[]): boolean {
  const continuations = generateMoveSequences(applyMoves(start, moves))
  if (continuations.length === 0) return isLegalSequence(start, moves)
  return continuations.some((c) => isLegalSequence(start, [...moves, ...c.moves]))
}

/** A first move is playable when the engine accepts some full turn that starts with it. */
function beginsLegalTurn(state: GameState, move: Move): boolean {
  return canCompleteTurn(state, [move])
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

/** Structured notation for a turn, with "(no move)" for a forfeited turn. */
export function turnRecord(player: Player, roll: number[], moves: Move[]): TurnRecord {
  const dice = roll.length > 2 ? `${roll[0]}-${roll[0]}` : [...roll].sort((a, b) => b - a).join('-')
  const played = moves.length === 0 ? '(no move)' : moves.map((m) => formatMove(player, m)).join(' ')
  return { player, notation: `${dice}: ${played}` }
}

/** "White 3-1: 8/5 6/5", with "(no move)" for a forfeited turn. */
export function formatTurn(player: Player, roll: number[], moves: Move[]): string {
  const record = turnRecord(player, roll, moves)
  return `${playerName(record.player)} ${record.notation}`
}
