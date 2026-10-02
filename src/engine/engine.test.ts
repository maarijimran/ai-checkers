import { describe, expect, it } from 'vitest'
import { evaluate, findBestMove } from './ai'
import { newGame, play } from './game'
import {
  BLACK,
  BLACK_KING,
  BLACK_MAN,
  WHITE,
  WHITE_KING,
  WHITE_MAN,
  applyMove,
  countPieces,
  generateMoves,
  idx,
  initialCells,
  notation,
  squareName,
  undoMove,
  winnerFor,
  type Cells,
  type Side,
} from './rules'

function board(...pieces: [number, number, number][]): Cells {
  const cells = new Int8Array(64)
  for (const [r, c, p] of pieces) cells[idx(r, c)] = p
  return cells
}

function perft(cells: Cells, side: Side, depth: number): number {
  const moves = generateMoves(cells, side)
  if (depth === 1) return moves.length
  let total = 0
  for (const m of moves) {
    applyMove(cells, m)
    total += perft(cells, -side as Side, depth - 1)
    undoMove(cells, m)
  }
  return total
}

describe('rules', () => {
  it('sets up 12 pieces a side on dark squares', () => {
    const cells = initialCells()
    expect(countPieces(cells, WHITE)).toBe(12)
    expect(countPieces(cells, BLACK)).toBe(12)
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) if ((r + c) % 2 === 0) expect(cells[idx(r, c)]).toBe(0)
  })

  it('has seven opening moves for each side', () => {
    expect(generateMoves(initialCells(), WHITE)).toHaveLength(7)
    expect(generateMoves(initialCells(), BLACK)).toHaveLength(7)
  })

  it('counts the same number of positions as the C program', () => {
    expect(perft(initialCells(), WHITE, 1)).toBe(7)
    expect(perft(initialCells(), WHITE, 2)).toBe(49)
    expect(perft(initialCells(), WHITE, 3)).toBe(379)
  })

  it('moves men forward only', () => {
    const cells = board([3, 2, WHITE_MAN], [4, 5, BLACK_MAN])
    const white = generateMoves(cells, WHITE).map((m) => [m.tr, m.tc])
    expect(white).toEqual(expect.arrayContaining([[4, 1], [4, 3]]))
    expect(white.every(([r]) => r === 4)).toBe(true)
    const black = generateMoves(cells, BLACK).map((m) => [m.tr, m.tc])
    expect(black.every(([r]) => r === 3)).toBe(true)
  })

  it('lets kings move in all four directions', () => {
    const cells = board([3, 2, WHITE_KING])
    expect(generateMoves(cells, WHITE)).toHaveLength(4)
  })

  it('captures by jumping an adjacent enemy into an empty square', () => {
    const cells = board([3, 2, WHITE_MAN], [4, 3, BLACK_MAN])
    const jump = generateMoves(cells, WHITE).find((m) => m.captured)
    expect(jump).toMatchObject({ fr: 3, fc: 2, tr: 5, tc: 4, captured: BLACK_MAN })
    applyMove(cells, jump!)
    expect(cells[idx(4, 3)]).toBe(0)
    expect(cells[idx(5, 4)]).toBe(WHITE_MAN)
  })

  it('does not capture a friendly piece or jump onto an occupied square', () => {
    const friendly = board([3, 2, WHITE_MAN], [4, 3, WHITE_MAN])
    expect(generateMoves(friendly, WHITE).some((m) => m.captured)).toBe(false)
    const blocked = board([3, 2, WHITE_MAN], [4, 3, BLACK_MAN], [5, 4, BLACK_MAN])
    expect(generateMoves(blocked, WHITE).some((m) => m.captured)).toBe(false)
  })

  it('men cannot capture backwards', () => {
    const cells = board([4, 3, WHITE_MAN], [3, 2, BLACK_MAN])
    expect(generateMoves(cells, WHITE).some((m) => m.captured)).toBe(false)
  })

  it('promotes a man on the far row and undo restores it', () => {
    const cells = board([6, 1, WHITE_MAN], [1, 2, BLACK_MAN])
    const toKing = generateMoves(cells, WHITE).find((m) => m.tr === 7 && m.tc === 2)!
    applyMove(cells, toKing)
    expect(cells[idx(7, 2)]).toBe(WHITE_KING)
    undoMove(cells, toKing)
    expect(cells[idx(6, 1)]).toBe(WHITE_MAN)
    expect(cells[idx(7, 2)]).toBe(0)

    const up = generateMoves(cells, BLACK).find((m) => m.tr === 0 && m.tc === 3)!
    applyMove(cells, up)
    expect(cells[idx(0, 3)]).toBe(BLACK_KING)
  })

  it('promotes on a capture that lands on the far row', () => {
    const cells = board([5, 2, WHITE_MAN], [6, 3, BLACK_MAN])
    const jump = generateMoves(cells, WHITE).find((m) => m.captured)!
    applyMove(cells, jump)
    expect(cells[idx(7, 4)]).toBe(WHITE_KING)
  })

  it('declares a winner when the side to move has no legal move', () => {
    expect(winnerFor(board([7, 0, BLACK_MAN]), WHITE)).toBe(BLACK)
    expect(winnerFor(initialCells(), WHITE)).toBeNull()
    const blocked = board([0, 1, WHITE_MAN], [1, 0, BLACK_MAN], [1, 2, BLACK_MAN], [2, 3, BLACK_MAN], [2, 1, BLACK_MAN])
    expect(winnerFor(blocked, WHITE)).toBe(BLACK)
  })

  it('names squares from a1 to h8', () => {
    expect(squareName(0, 7)).toBe('a1')
    expect(squareName(7, 0)).toBe('h8')
    const m = generateMoves(initialCells(), WHITE)[0]
    expect(notation(m)).toMatch(/^[a-h][1-8]-[a-h][1-8]$/)
  })
})

describe('game', () => {
  it('moves a piece and keeps its id for animation', () => {
    const start = newGame()
    const move = generateMoves(start.cells, WHITE)[0]
    const id = start.ids[idx(move.fr, move.fc)]
    const next = play(start, move)
    expect(next.ids[idx(move.tr, move.tc)]).toBe(id)
    expect(next.ids[idx(move.fr, move.fc)]).toBe(-1)
    expect(next.turn).toBe(BLACK)
    expect(next.label).toBe(notation(move))
    expect(start.cells[idx(move.fr, move.fc)]).toBe(WHITE_MAN)
  })

  it('removes the id of a captured piece and reports the winner', () => {
    const cells = board([3, 2, WHITE_MAN], [4, 3, BLACK_MAN])
    const ids = new Array(64).fill(-1)
    ids[idx(3, 2)] = 0
    ids[idx(4, 3)] = 1
    const start = { cells, ids, turn: WHITE as Side, last: null, label: '', winner: null }
    const jump = generateMoves(cells, WHITE).find((m) => m.captured)!
    const next = play(start, jump)
    expect(next.ids[idx(4, 3)]).toBe(-1)
    expect(next.winner).toBe(WHITE)
  })
})

describe('ai', () => {
  const quick = { timeMs: 5000, maxDepth: 4 }

  it('has no move when the side is stuck', () => {
    const result = findBestMove(board([7, 0, BLACK_MAN]), WHITE, quick)
    expect(result.move).toBeNull()
  })

  it('plays the only legal move without searching', () => {
    const cells = board([6, 1, BLACK_MAN], [5, 0, WHITE_MAN], [1, 6, WHITE_MAN])
    const only = generateMoves(cells, BLACK)
    expect(only).toHaveLength(1)
    expect(findBestMove(cells, BLACK, quick).move).toMatchObject({ tr: only[0].tr, tc: only[0].tc })
  })

  it('takes a free piece', () => {
    const cells = board([5, 2, BLACK_MAN], [4, 3, WHITE_MAN], [0, 1, WHITE_MAN], [7, 6, BLACK_MAN])
    const result = findBestMove(cells, BLACK, quick)
    expect(result.move).toMatchObject({ fr: 5, fc: 2, tr: 3, tc: 4 })
  })

  it('does not step into a capture when a safe move exists', () => {
    const cells = board([4, 1, WHITE_MAN], [5, 2, BLACK_MAN], [6, 5, BLACK_MAN], [0, 7, WHITE_MAN])
    const result = findBestMove(cells, BLACK, { timeMs: 5000, maxDepth: 3 })
    expect(result.move).not.toMatchObject({ fr: 5, fc: 2, tr: 4, tc: 3 })
  })

  it('goes for a promotion', () => {
    const cells = board([1, 2, BLACK_MAN], [6, 5, WHITE_MAN], [7, 0, BLACK_MAN])
    const result = findBestMove(cells, BLACK, quick)
    expect(result.move).toMatchObject({ fr: 1, fc: 2, tr: 0 })
  })

  it('finds a forced win and scores it as one', () => {
    const cells = board([4, 3, WHITE_MAN], [5, 2, BLACK_MAN], [6, 5, BLACK_MAN])
    const result = findBestMove(cells, BLACK, quick)
    expect(result.move).toMatchObject({ fr: 5, fc: 2, tr: 3, tc: 4 })
    expect(result.score).toBeGreaterThan(90000)
  })

  it('plays the same strength as either colour', () => {
    const mirror = (cells: Cells) => {
      const out = new Int8Array(64)
      for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) out[idx(7 - r, 7 - c)] = -cells[idx(r, c)]
      return out
    }
    const cells = initialCells()
    for (let i = 0; i < 6; i++) {
      const side = (i % 2 === 0 ? WHITE : BLACK) as Side
      applyMove(cells, generateMoves(cells, side)[i % 3])
    }
    const fixed = { timeMs: 60000, maxDepth: 5 }
    const asBlack = findBestMove(cells, BLACK, fixed)
    const asWhite = findBestMove(mirror(cells), WHITE, fixed)
    expect(asWhite.score).toBe(asBlack.score)
    expect(evaluate(mirror(cells))).toBe(-evaluate(cells))
  })

  it('respects its time budget', () => {
    const start = performance.now()
    const result = findBestMove(initialCells(), BLACK, { timeMs: 100, maxDepth: 30 })
    expect(performance.now() - start).toBeLessThan(600)
    expect(result.move).not.toBeNull()
  })

  it('never changes the board it is given', () => {
    const cells = initialCells()
    const copy = cells.slice()
    findBestMove(cells, BLACK, { timeMs: 100, maxDepth: 30 })
    expect(cells).toEqual(copy)
  })
})
