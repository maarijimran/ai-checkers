import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Board } from './components/Board'
import { Panel, type Mode } from './components/Panel'
import { useAi } from './hooks/useAi'
import { LEVELS, newGame, play, type Snapshot } from './engine/game'
import type { SearchResult } from './engine/ai'
import { BLACK, WHITE, generateMoves, idx, opponent, type Move, type Side } from './engine/rules'
import { REPO_URL } from './config'

const AI_MIN_DELAY_MS = 450

export default function App() {
  const [mode, setMode] = useState<Mode>('ai')
  const [humanSide, setHumanSide] = useState<Side>(WHITE)
  const [levelIdx, setLevelIdx] = useState(2)
  const [history, setHistory] = useState<Snapshot[]>(() => [newGame()])
  const [selected, setSelected] = useState<number | null>(null)
  const [hint, setHint] = useState<Move | null>(null)
  const [thinking, setThinking] = useState(false)
  const [hinting, setHinting] = useState(false)
  const [aiInfo, setAiInfo] = useState<SearchResult | null>(null)
  const [blackAtBottom, setBlackAtBottom] = useState(false)
  const ai = useAi()

  const current = history[history.length - 1]
  const latest = useRef(current)
  latest.current = current

  const aiSide: Side | null = mode === 'ai' ? opponent(humanSide) : null
  const bottom: Side = mode === 'ai' ? humanSide : blackAtBottom ? BLACK : WHITE
  const legal = useMemo(
    () => (current.winner ? [] : generateMoves(current.cells, current.turn)),
    [current],
  )
  const humansTurn = !current.winner && (mode === 'local' || current.turn === humanSide)
  const canMove = humansTurn && !thinking && !hinting
  const targets = useMemo(
    () => (selected === null ? [] : legal.filter((m) => idx(m.fr, m.fc) === selected)),
    [legal, selected],
  )

  const push = useCallback((m: Move) => {
    setHistory((h) => [...h, play(h[h.length - 1], m)])
    setSelected(null)
    setHint(null)
  }, [])

  const reset = useCallback(() => {
    ai.cancel()
    setHistory([newGame()])
    setSelected(null)
    setHint(null)
    setThinking(false)
    setHinting(false)
    setAiInfo(null)
  }, [ai])

  // The AI answers whenever it is its turn.
  useEffect(() => {
    if (aiSide === null || current.winner || current.turn !== aiSide) return
    let cancelled = false
    let timer: number | undefined
    const started = performance.now()
    setThinking(true)
    ai.think(current.cells, aiSide, LEVELS[levelIdx]).then((result) => {
      if (cancelled || !result.move) return
      const move = result.move
      timer = window.setTimeout(() => {
        setAiInfo(result)
        setThinking(false)
        push(move)
      }, Math.max(0, AI_MIN_DELAY_MS - (performance.now() - started)))
    })
    return () => {
      cancelled = true
      window.clearTimeout(timer)
      ai.cancel()
      setThinking(false)
    }
  }, [current, aiSide, levelIdx, ai, push])

  const onSquare = (r: number, c: number) => {
    if (!canMove) return
    const i = idx(r, c)
    const move = targets.find((m) => m.tr === r && m.tc === c)
    if (move) {
      push(move)
    } else if (legal.some((m) => idx(m.fr, m.fc) === i)) {
      setSelected(i === selected ? null : i)
    } else {
      setSelected(null)
    }
  }

  const changeMode = (next: Mode) => {
    if (next === mode) return
    if (history.length > 1 && !current.winner && !window.confirm('Start a new game?')) return
    setMode(next)
    reset()
  }

  const changeSide = (next: Side) => {
    if (next === humanSide) return
    if (history.length > 1 && !current.winner && !window.confirm('Start a new game?')) return
    setHumanSide(next)
    reset()
  }

  // Takes back moves until it is the human's turn again.
  const undo = () => {
    ai.cancel()
    setThinking(false)
    setHinting(false)
    setSelected(null)
    setHint(null)
    setHistory((h) => {
      const next = h.slice(0, -1)
      if (mode === 'ai') {
        while (next.length > 1 && next[next.length - 1].turn !== humanSide) next.pop()
      }
      return next
    })
  }
  const canUndo = mode === 'ai' ? history.length > (humanSide === WHITE ? 1 : 2) : history.length > 1

  const askHint = async () => {
    const asked = latest.current
    setHinting(true)
    const result = await ai.think(asked.cells, asked.turn, { timeMs: 900, maxDepth: 30 })
    if (latest.current !== asked) return
    setHinting(false)
    setHint(result.move)
  }

  return (
    <div className="app">
      <header className="top">
        <h1>
          <span className="logo" aria-hidden="true" />
          Checkers <em>AI</em>
        </h1>
        <p>Play against an alpha-beta search engine that runs entirely in your browser.</p>
      </header>

      <main className="layout">
        <div className="board-wrap">
          <Board
            snapshot={current}
            bottom={bottom}
            selected={selected}
            targets={targets}
            hint={hint}
            interactive={canMove}
            onSquare={onSquare}
          />
          {current.winner && (
            <div className="over" role="dialog" aria-label="Game over">
              <h2>
                {mode === 'ai'
                  ? current.winner === humanSide
                    ? 'You win!'
                    : 'The AI wins'
                  : `${current.winner === WHITE ? 'White' : 'Black'} wins`}
              </h2>
              <p>
                {current.turn === WHITE ? 'White' : 'Black'} has no legal moves left.
              </p>
              <button className="primary" onClick={reset}>
                Play again
              </button>
            </div>
          )}
        </div>

        <Panel
          mode={mode}
          humanSide={humanSide}
          levelIdx={levelIdx}
          history={history}
          thinking={thinking}
          hinting={hinting}
          aiInfo={aiInfo}
          canUndo={canUndo}
          canHint={canMove && mode === 'ai'}
          onMode={changeMode}
          onSide={changeSide}
          onLevel={setLevelIdx}
          onNew={reset}
          onUndo={undo}
          onHint={askHint}
          onFlip={() => setBlackAtBottom((b) => !b)}
        />
      </main>

      <footer>
        <a href={REPO_URL} target="_blank" rel="noreferrer">
          Source on GitHub
        </a>
        <span>Originally a C console project, now with a web front end.</span>
      </footer>
    </div>
  )
}
