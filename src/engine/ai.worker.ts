import { findBestMove, type SearchOptions, type SearchResult } from './ai'
import type { Side } from './rules'

export interface WorkerRequest {
  id: number
  cells: Int8Array
  side: Side
  options: SearchOptions
}

export interface WorkerResponse {
  id: number
  result: SearchResult
}

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const { id, cells, side, options } = event.data
  const result = findBestMove(cells, side, options)
  const response: WorkerResponse = { id, result }
  ;(self as unknown as { postMessage(message: WorkerResponse): void }).postMessage(response)
}
