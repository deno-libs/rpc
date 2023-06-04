import type { JsonRpcRequest, JsonRpcResponse } from './types.ts'
import { makeArray } from './utils.ts'

export function send(
  socket: WebSocket,
  message: JsonRpcResponse | JsonRpcResponse[],
): void {
  const messages = makeArray<JsonRpcResponse>(message)
  messages.forEach((message) => {
    message.jsonrpc = '2.0'
    if (messages.length === 1) socket.send(JSON.stringify(message))
  })
  if (messages.length !== 1) socket.send(JSON.stringify(messages))
}

export function parseRequest(
  json: string,
): (JsonRpcRequest | 'invalid')[] | 'parse-error' {
  try {
    const arr = makeArray(JSON.parse(json))
    const res: (JsonRpcRequest | 'invalid')[] = []
    for (const obj of arr) {
      if (
        typeof obj !== 'object' || !obj || obj.jsonrpc !== '2.0' ||
        typeof obj.method !== 'string'
      ) res.push('invalid')
      else res.push(obj)
    }

    if (!res.length) return ['invalid']

    return res
  } catch {
    return 'parse-error'
  }
}
