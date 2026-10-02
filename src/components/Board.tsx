import { idx, isDark, isKing, SIZE, squareName, WHITE, type Move, type Side } from '../engine/rules'
import type { Snapshot } from '../engine/game'

interface BoardProps {
  snapshot: Snapshot
  /** The side shown at the bottom of the screen. */
  bottom: Side
  selected: number | null
  targets: Move[]
  hint: Move | null
  interactive: boolean
  onSquare: (r: number, c: number) => void
}

function Crown() {
  return (
    <svg className="crown" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 10H5L3 8z" />
    </svg>
  )
}

export function Board({ snapshot, bottom, selected, targets, hint, interactive, onSquare }: BoardProps) {
  const flip = bottom === WHITE
  const place = (r: number, c: number) => ({ row: flip ? SIZE - 1 - r : r, col: flip ? SIZE - 1 - c : c })
  const { cells, ids, last } = snapshot

  const squares = []
  for (let dr = 0; dr < SIZE; dr++) {
    for (let dc = 0; dc < SIZE; dc++) {
      const r = flip ? SIZE - 1 - dr : dr
      const c = flip ? SIZE - 1 - dc : dc
      const i = idx(r, c)
      const dark = isDark(r, c)
      const target = targets.find((m) => m.tr === r && m.tc === c)
      const classes = ['sq', dark ? 'dark' : 'light']
      if (last && ((last.fr === r && last.fc === c) || (last.tr === r && last.tc === c))) classes.push('last')
      if (selected === i) classes.push('selected')
      if (target) classes.push(target.captured ? 'capture' : 'target')
      if (hint && hint.fr === r && hint.fc === c) classes.push('hint-from')
      if (hint && hint.tr === r && hint.tc === c) classes.push('hint-to')
      const label =
        squareName(r, c) +
        (cells[i] ? `, ${cells[i] > 0 ? 'black' : 'white'} ${isKing(cells[i]) ? 'king' : 'man'}` : '') +
        (target ? (target.captured ? ', capture here' : ', move here') : '')
      squares.push(
        <button
          key={i}
          className={classes.join(' ')}
          disabled={!dark || !interactive}
          onClick={() => onSquare(r, c)}
          aria-label={label}
          tabIndex={dark ? 0 : -1}
        >
          {dc === 0 && <span className="coord rank">{r + 1}</span>}
          {dr === SIZE - 1 && <span className="coord file">{String.fromCharCode(97 + SIZE - 1 - c)}</span>}
        </button>,
      )
    }
  }

  const pieces = []
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const i = idx(r, c)
      const p = cells[i]
      if (p === 0) continue
      const { row, col } = place(r, c)
      const classes = ['piece', p > 0 ? 'black' : 'white']
      if (isKing(p)) classes.push('king')
      if (selected === i) classes.push('lifted')
      pieces.push(
        <div
          key={ids[i]}
          className={classes.join(' ')}
          style={{ transform: `translate(${col * 100}%, ${row * 100}%)` }}
        >
          <div className="disc">{isKing(p) && <Crown />}</div>
        </div>,
      )
    }
  }

  return (
    <div className="board" role="group" aria-label="Checkers board">
      <div className="squares">{squares}</div>
      <div className="pieces">{pieces}</div>
    </div>
  )
}
