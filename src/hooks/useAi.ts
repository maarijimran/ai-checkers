import { useCallback, useEffect, useMemo, useRef } from 'react'
import type { SearchOptions, SearchResult } from '../engine/ai'
import type { WorkerRequest, WorkerResponse } from '../engine/ai.worker'
import type { Cells, Side } from '../engine/rules'

interface Pending {
  id: number
  resolve: (result: SearchResult) => void
}

/**
 * Runs searches in a Web Worker. A running search cannot be interrupted from
 * outside, so cancelling terminates the worker and a fresh one starts on the
 * next request. The returned object is stable between renders.
 */
export function useAi() {
  const worker = useRef<Worker | null>(null)
  const pending = useRef<Pending | null>(null)
  const counter = useRef(0)

  const stop = useCallback(() => {
    pending.current = null
    worker.current?.terminate()
    worker.current = null
  }, [])

  const cancel = useCallback(() => {
    if (pending.current) stop()
  }, [stop])

  const think = useCallback((cells: Cells, side: Side, options: SearchOptions) => {
    if (!worker.current) {
      const w = new Worker(new URL('../engine/ai.worker.ts', import.meta.url), { type: 'module' })
      w.onmessage = (event: MessageEvent<WorkerResponse>) => {
        const current = pending.current
        if (current && current.id === event.data.id) {
          pending.current = null
          current.resolve(event.data.result)
        }
      }
      worker.current = w
    }
    const id = ++counter.current
    return new Promise<SearchResult>((resolve) => {
      pending.current = { id, resolve }
      const request: WorkerRequest = { id, cells: cells.slice(), side, options }
      worker.current!.postMessage(request)
    })
  }, [])

  useEffect(() => stop, [stop])

  return useMemo(() => ({ think, cancel }), [think, cancel])
}
