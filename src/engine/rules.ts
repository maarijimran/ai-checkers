// Board rules for the game. These mirror the C program in cli/ exactly:
// men move and capture forward only, kings move one square in any direction,
// captures are optional, a jump is a single hop, and a side with no legal move loses.

export type Side = 1 | -1
export const BLACK: Side = 1
export const WHITE: Side = -1

// Cell values. The sign is the side (black positive, white negative); 2 is a king.
export const EMPTY = 0
export const BLACK_MAN = 1
export const BLACK_KING = 2
export const WHITE_MAN = -1
export const WHITE_KING = -2

export const SIZE = 8
export type Cells = Int8Array

export interface Move {
  fr: number
  fc: number
  tr: number
  tc: number
  piece: number
  /** The enemy piece jumped over, or 0 for a plain step. */
  captured: number
}

export const opponent = (side: Side): Side => (side === BLACK ? WHITE : BLACK)
export const isKing = (piece: number) => piece === BLACK_KING || piece === WHITE_KING
export const isDark = (r: number, c: number) => (r + c) % 2 === 1
export const idx = (r: number, c: number) => r * SIZE + c

/** White starts on rows 0-2 and moves down, black starts on rows 5-7 and moves up. */
export function initialCells(): Cells {
  const cells = new Int8Array(SIZE * SIZE)
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (!isDark(r, c)) continue
      if (r < 3) cells[idx(r, c)] = WHITE_MAN
      else if (r > 4) cells[idx(r, c)] = BLACK_MAN
    }
  }
  return cells
}

const DIRS: ReadonlyArray<readonly [number, number]> = [
  [-1, 1],
  [-1, -1],
  [1, 1],
  [1, -1],
]

/** Every legal move for a side. Captures come before steps for each piece. */
export function generateMoves(cells: Cells, side: Side): Move[] {
  const moves: Move[] = []
  const forward = -side
  for (let r = SIZE - 1; r >= 0; r--) {
    for (let c = SIZE - 1; c >= 0; c--) {
      const piece = cells[idx(r, c)]
      if (piece * side <= 0) continue
      const king = isKing(piece)
      for (let dist = 2; dist >= 1; dist--) {
        for (const [dr, dc] of DIRS) {
          if (!king && dr !== forward) continue
          const tr = r + dr * dist
          const tc = c + dc * dist
          if (tr < 0 || tr >= SIZE || tc < 0 || tc >= SIZE) continue
          if (cells[idx(tr, tc)] !== EMPTY) continue
          let captured = 0
          if (dist === 2) {
            captured = cells[idx(r + dr, c + dc)]
            if (captured * side >= 0) continue
          }
          moves.push({ fr: r, fc: c, tr, tc, piece, captured })
        }
      }
    }
  }
  return moves
}

/** Applies a move in place. A man that reaches the far row becomes a king. */
export function applyMove(cells: Cells, m: Move): void {
  let placed = m.piece
  if (m.piece === BLACK_MAN && m.tr === 0) placed = BLACK_KING
  else if (m.piece === WHITE_MAN && m.tr === SIZE - 1) placed = WHITE_KING
  cells[idx(m.fr, m.fc)] = EMPTY
  if (m.captured) cells[idx((m.fr + m.tr) / 2, (m.fc + m.tc) / 2)] = EMPTY
  cells[idx(m.tr, m.tc)] = placed
}

export function undoMove(cells: Cells, m: Move): void {
  cells[idx(m.tr, m.tc)] = EMPTY
  if (m.captured) cells[idx((m.fr + m.tr) / 2, (m.fc + m.tc) / 2)] = m.captured
  cells[idx(m.fr, m.fc)] = m.piece
}

export const sameMove = (a: Move, b: Move) =>
  a.fr === b.fr && a.fc === b.fc && a.tr === b.tr && a.tc === b.tc

export function countPieces(cells: Cells, side: Side): number {
  let n = 0
  for (const p of cells) if (p * side > 0) n++
  return n
}

/** The winner if the side to move has no legal move, otherwise null. */
export function winnerFor(cells: Cells, toMove: Side): Side | null {
  return generateMoves(cells, toMove).length === 0 ? opponent(toMove) : null
}

/** Square names run a1 (bottom left when white is at the bottom) to h8. */
export function squareName(r: number, c: number): string {
  return String.fromCharCode(97 + (SIZE - 1 - c)) + (r + 1)
}

export function notation(m: Move): string {
  return `${squareName(m.fr, m.fc)}${m.captured ? 'x' : '-'}${squareName(m.tr, m.tc)}`
}
