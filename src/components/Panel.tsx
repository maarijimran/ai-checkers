import { LEVELS, type Snapshot } from '../engine/game'
import { BLACK, WHITE, countPieces, type Side } from '../engine/rules'
import { WIN_SCORE, type SearchResult } from '../engine/ai'

export type Mode = 'ai' | 'local'

interface Choice<T> {
  value: T
  label: string
}

function Segmented<T extends string | number>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: Choice<T>[]
  onChange: (value: T) => void
}) {
  return (
    <div className="field">
      <span className="field-label">{label}</span>
      <div className="segmented" role="radiogroup" aria-label={label}>
        {options.map((o) => (
          <button
            key={String(o.value)}
            role="radio"
            aria-checked={o.value === value}
            className={o.value === value ? 'on' : ''}
            onClick={() => onChange(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}

const sideName = (s: Side) => (s === WHITE ? 'White' : 'Black')

function describeScore(score: number): string {
  if (score >= WIN_SCORE - 100) return 'AI sees a win'
  if (score <= -WIN_SCORE + 100) return 'AI sees a loss'
  const men = score / 100
  return `${men >= 0 ? '+' : ''}${men.toFixed(1)} men`
}

interface PanelProps {
  mode: Mode
  humanSide: Side
  levelIdx: number
  history: Snapshot[]
  thinking: boolean
  hinting: boolean
  aiInfo: SearchResult | null
  canUndo: boolean
  canHint: boolean
  onMode: (m: Mode) => void
  onSide: (s: Side) => void
  onLevel: (i: number) => void
  onNew: () => void
  onUndo: () => void
  onHint: () => void
  onFlip: () => void
}

export function Panel(p: PanelProps) {
  const current = p.history[p.history.length - 1]
  const white = countPieces(current.cells, WHITE)
  const black = countPieces(current.cells, BLACK)

  let status: string
  let tone: 'white' | 'black' | 'over' = current.turn === WHITE ? 'white' : 'black'
  if (current.winner) {
    tone = 'over'
    status =
      p.mode === 'ai'
        ? current.winner === p.humanSide
          ? 'You win!'
          : 'The AI wins'
        : `${sideName(current.winner)} wins`
  } else if (p.mode === 'ai') {
    status = current.turn === p.humanSide ? 'Your move' : 'AI is thinking…'
  } else {
    status = `${sideName(current.turn)} to move`
  }

  const moves = p.history.slice(1)
  const rows: { n: number; white: string; black?: string }[] = []
  for (let i = 0; i < moves.length; i += 2) {
    rows.push({ n: i / 2 + 1, white: moves[i].label, black: moves[i + 1]?.label })
  }

  return (
    <aside className="panel">
      <section className="card status" aria-live="polite">
        <div className="status-line">
          <span className={`dot ${tone}`} />
          <strong>{status}</strong>
          {(p.thinking || p.hinting) && <span className="spinner" aria-hidden="true" />}
        </div>
        <div className="counts">
          <span>
            <i className="chip white" /> White {white}
          </span>
          <span>
            <i className="chip black" /> Black {black}
          </span>
        </div>
      </section>

      <section className="card">
        <Segmented<Mode>
          label="Opponent"
          value={p.mode}
          onChange={p.onMode}
          options={[
            { value: 'ai', label: 'Computer' },
            { value: 'local', label: 'Two players' },
          ]}
        />
        {p.mode === 'ai' && (
          <>
            <Segmented<Side>
              label="You play"
              value={p.humanSide}
              onChange={p.onSide}
              options={[
                { value: WHITE, label: 'White (first)' },
                { value: BLACK, label: 'Black' },
              ]}
            />
            <Segmented<number>
              label="Difficulty"
              value={p.levelIdx}
              onChange={p.onLevel}
              options={LEVELS.map((l, i) => ({ value: i, label: l.name }))}
            />
          </>
        )}
        <div className="buttons">
          <button className="primary" onClick={p.onNew}>
            New game
          </button>
          <button onClick={p.onUndo} disabled={!p.canUndo}>
            Undo
          </button>
          {p.mode === 'ai' ? (
            <button onClick={p.onHint} disabled={!p.canHint}>
              Hint
            </button>
          ) : (
            <button onClick={p.onFlip}>Flip board</button>
          )}
        </div>
      </section>

      {p.mode === 'ai' && p.aiInfo && (
        <section className="card ai-info">
          <h2>Last AI search</h2>
          <dl>
            <div>
              <dt>Depth</dt>
              <dd>{p.aiInfo.depth} plies</dd>
            </div>
            <div>
              <dt>Positions</dt>
              <dd>{p.aiInfo.nodes.toLocaleString()}</dd>
            </div>
            <div>
              <dt>Time</dt>
              <dd>{(p.aiInfo.elapsedMs / 1000).toFixed(2)} s</dd>
            </div>
            <div>
              <dt>Evaluation</dt>
              <dd>{describeScore(p.aiInfo.score)}</dd>
            </div>
          </dl>
        </section>
      )}

      <section className="card moves">
        <h2>Moves</h2>
        {rows.length === 0 ? (
          <p className="muted">No moves yet. White goes first.</p>
        ) : (
          <ol>
            {rows.map((row) => (
              <li key={row.n}>
                <span className="num">{row.n}.</span>
                <span>{row.white}</span>
                <span>{row.black ?? ''}</span>
              </li>
            ))}
          </ol>
        )}
      </section>

      <details className="card rules">
        <summary>Rules in this version</summary>
        <ul>
          <li>Pieces move diagonally onto empty dark squares. White starts on ranks 1 to 3 and moves first.</li>
          <li>Men move and capture forward only. Kings move and capture one square in any direction.</li>
          <li>A capture jumps over an adjacent enemy piece. Captures are optional and a turn is a single jump.</li>
          <li>A man that reaches the far row becomes a king.</li>
          <li>You win when your opponent has no pieces or no legal move.</li>
        </ul>
      </details>
    </aside>
  )
}
