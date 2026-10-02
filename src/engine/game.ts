import {
  applyMove,
  idx,
  initialCells,
  notation,
  winnerFor,
  WHITE,
  opponent,
  type Cells,
  type Move,
  type Side,
} from './rules'

export interface Snapshot {
  cells: Cells
  ids: number[]
  turn: Side
  last: Move | null
  label: string
  winner: Side | null
}

export function newGame(): Snapshot {
  const cells = initialCells()
  let next = 0
  const ids = Array.from(cells, (p) => (p !== 0 ? next++ : -1))
  return { cells, ids, turn: WHITE, last: null, label: '', winner: null }
}

export function play(s: Snapshot, m: Move): Snapshot {
  const cells = s.cells.slice()
  const ids = s.ids.slice()
  const mover = ids[idx(m.fr, m.fc)]
  ids[idx(m.fr, m.fc)] = -1
  if (m.captured) ids[idx((m.fr + m.tr) / 2, (m.fc + m.tc) / 2)] = -1
  ids[idx(m.tr, m.tc)] = mover
  applyMove(cells, m)
  const turn = opponent(s.turn)
  return { cells, ids, turn, last: m, label: notation(m), winner: winnerFor(cells, turn) }
}

export interface Level {
  name: string
  timeMs: number
  maxDepth: number
}

export const LEVELS: Level[] = [
  { name: 'Easy', timeMs: 150, maxDepth: 2 },
  { name: 'Medium', timeMs: 500, maxDepth: 4 },
  { name: 'Hard', timeMs: 1200, maxDepth: 30 },
  { name: 'Expert', timeMs: 3000, maxDepth: 30 },
]
