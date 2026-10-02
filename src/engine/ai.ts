import {
  applyMove,
  generateMoves,
  idx,
  opponent,
  SIZE,
  undoMove,
  type Cells,
  type Move,
  type Side,
} from './rules'

export const MAN_VALUE = 100
export const KING_VALUE = 250
const ADVANCE_BONUS = 5
const HOME_ROW_BONUS = 10
const CENTRE_BONUS = 5
export const WIN_SCORE = 100000
export const MAX_DEPTH = 30
const INF = 1e9

export interface SearchOptions {
  timeMs: number
  maxDepth: number
}

export interface SearchResult {
  move: Move | null
  score: number
  depth: number
  nodes: number
  elapsedMs: number
}

export function evaluate(cells: Cells): number {
  let score = 0
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const p = cells[idx(r, c)]
      if (p === 0) continue
      let value: number
      if (p === 1) value = MAN_VALUE + (SIZE - 1 - r) * ADVANCE_BONUS + (r === SIZE - 1 ? HOME_ROW_BONUS : 0)
      else if (p === -1) value = MAN_VALUE + r * ADVANCE_BONUS + (r === 0 ? HOME_ROW_BONUS : 0)
      else value = KING_VALUE
      if (r >= 2 && r <= 5 && c >= 2 && c <= 5) value += CENTRE_BONUS
      score += p > 0 ? value : -value
    }
  }
  return score
}

function orderMoves(moves: Move[]): void {
  moves.sort((a, b) => (b.captured ? 1 : 0) - (a.captured ? 1 : 0))
}

export function findBestMove(input: Cells, side: Side, opts: SearchOptions): SearchResult {
  const cells = input.slice()
  const start = performance.now()
  const deadline = start + opts.timeMs
  let nodes = 0
  let timeUp = false

  const outOfTime = () => {
    if ((++nodes & 1023) === 0 && performance.now() >= deadline) timeUp = true
    return timeUp
  }

  const quiesce = (alpha: number, beta: number, turn: Side): number => {
    if (outOfTime()) return 0
    let best = evaluate(cells) * turn
    if (best >= beta) return best
    if (best > alpha) alpha = best
    const moves = generateMoves(cells, turn)
    for (const m of moves) {
      if (!m.captured) continue
      applyMove(cells, m)
      const value = -quiesce(-beta, -alpha, opponent(turn))
      undoMove(cells, m)
      if (timeUp) return 0
      if (value > best) best = value
      if (best > alpha) alpha = best
      if (alpha >= beta) break
    }
    return best
  }

  const negamax = (depth: number, alpha: number, beta: number, turn: Side, ply: number): number => {
    if (outOfTime()) return 0
    if (depth <= 0) return quiesce(alpha, beta, turn)
    const moves = generateMoves(cells, turn)
    if (moves.length === 0) return -WIN_SCORE + ply
    orderMoves(moves)
    let best = -INF
    for (const m of moves) {
      applyMove(cells, m)
      const value = -negamax(depth - 1, -beta, -alpha, opponent(turn), ply + 1)
      undoMove(cells, m)
      if (timeUp) return 0
      if (value > best) best = value
      if (best > alpha) alpha = best
      if (alpha >= beta) break
    }
    return best
  }

  const rootMoves = generateMoves(cells, side)
  const finish = (move: Move | null, score: number, depth: number): SearchResult => ({
    move,
    score,
    depth,
    nodes,
    elapsedMs: performance.now() - start,
  })
  if (rootMoves.length === 0) return finish(null, -WIN_SCORE, 0)
  orderMoves(rootMoves)
  let result = finish(rootMoves[0], evaluate(cells) * side, 0)
  if (rootMoves.length === 1) return result

  for (let depth = 1; depth <= Math.min(opts.maxDepth, MAX_DEPTH); depth++) {
    let bestVal = -INF
    let bestIdx = 0
    for (let n = 0; n < rootMoves.length; n++) {
      const m = rootMoves[n]
      applyMove(cells, m)
      const value = -negamax(depth - 1, -INF, -bestVal, opponent(side), 1)
      undoMove(cells, m)
      if (timeUp) break
      if (value > bestVal) {
        bestVal = value
        bestIdx = n
      }
    }
    if (timeUp) break
    const [best] = rootMoves.splice(bestIdx, 1)
    rootMoves.unshift(best)
    result = finish(best, bestVal, depth)
    if (Math.abs(bestVal) >= WIN_SCORE - MAX_DEPTH * 2) break
  }
  return { ...result, nodes, elapsedMs: performance.now() - start }
}
