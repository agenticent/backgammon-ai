import { cloneState, createInitialState, getWinner } from './board.ts'
import type { Rng } from './dice.ts'
import { diceForRoll, openingRoll, rollDice } from './dice.ts'
import { generateMoveSequences, isLegalSequence, applyMoves } from './moves.ts'
import type { GameState, Move, Player } from './types.ts'
import { opponentOf } from './types.ts'

export class IllegalMoveError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'IllegalMoveError'
  }
}

/** Starts a game with the opening roll: higher single die moves first. */
export function startGame(rng: Rng = Math.random): GameState {
  const opening = openingRoll(rng)
  return createInitialState(opening.first, opening.dice)
}

/** Rolls for the player on turn, doubles yielding four moves. */
export function rollForTurn(state: GameState, rng: Rng = Math.random): GameState {
  const next = cloneState(state)
  next.dice = diceForRoll(rollDice(rng))
  return next
}

/** Passes the turn to the opponent with no dice rolled yet. */
export function endTurn(state: GameState): GameState {
  const next = cloneState(state)
  next.turn = opponentOf(state.turn)
  next.dice = []
  return next
}

/** Applies a full legal sequence for the turn, throwing if it is not legal. */
export function playMoveSequence(state: GameState, moves: Move[]): GameState {
  if (!isLegalSequence(state, moves)) {
    throw new IllegalMoveError('move sequence is not legal in this position')
  }
  return applyMoves(state, moves)
}

export function isGameOver(state: GameState): boolean {
  return getWinner(state) !== null
}

export function winner(state: GameState): Player | null {
  return getWinner(state)
}

/** True when the player on turn has dice but cannot play any of them. */
export function isTurnForfeited(state: GameState): boolean {
  return state.dice.length > 0 && generateMoveSequences(state).length === 0
}
