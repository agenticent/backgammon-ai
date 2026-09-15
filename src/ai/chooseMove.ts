import {
  generateMoveSequences,
} from '../engine/index.ts'
import type { GameState, MoveSequence, Rng } from '../engine/index.ts'
import {
  DEFAULT_WEIGHTS,
  evaluatePosition,
} from './evaluation.ts'
import type { EvaluationWeights } from './evaluation.ts'

export type Difficulty = 'easy' | 'normal'

export interface AiOptions {
  difficulty?: Difficulty
  weights?: EvaluationWeights
  rng?: Rng
}

export function chooseMoveSequence(
  state: GameState,
  options: AiOptions = {},
): MoveSequence | null {
  const sequences = generateMoveSequences(state)
  if (sequences.length === 0) return null

  const rng = options.rng ?? Math.random
  if (options.difficulty === 'easy') {
    return sequences[Math.floor(rng() * sequences.length)]
  }

  const weights = options.weights ?? DEFAULT_WEIGHTS
  const scores = sequences.map((sequence) =>
    evaluatePosition(sequence.result, state.turn, weights),
  )
  const highest = Math.max(...scores)
  const best = sequences.filter((_, index) => highest - scores[index] <= 1e-9)
  return best[Math.floor(rng() * best.length)]
}
