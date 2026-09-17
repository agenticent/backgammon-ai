import type { Player } from '../engine/index.ts'

export interface TurnRecord {
  player: Player
  notation: string
}

export interface LogRow {
  white: string | null
  black: string | null
}

export function groupTurns(log: TurnRecord[]): LogRow[] {
  const rows: LogRow[] = []
  for (const entry of log) {
    const current = rows[rows.length - 1]
    if (!current || entry.player === 'white' || current[entry.player] !== null) {
      rows.push({ white: null, black: null })
    }
    rows[rows.length - 1][entry.player] = entry.notation
  }
  return rows.reverse()
}
