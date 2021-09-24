import { JsonRpcRequest } from './types.ts'
import { makeArray } from './utils.ts'

export function send(socket: WebSocket, message: any) {
  const messages = makeArray(message)
  messages.forEach((message) => {
    message.jsonrpc = '2.0'
    if (messages.length === 1) socket.send(JSON.stringify(message))
  })
  if (messages.length !== 1) socket.send(JSON.stringify(messages))
}

export function parseRequest(json: string): (JsonRpcRequest | 'invalid')[] | 'parse-error' {
  try {
    const arr = makeArray(JSON.parse(json))
    const res: (JsonRpcRequest | 'invalid')[] = []

    for (let obj of arr) {
      if (typeof obj !== 'object') res.push('invalid')
      else if (!obj) res.push('invalid')
      else if (obj.jsonrpc !== '2.0') res.push('invalid')
      else if (typeof obj.method !== 'string') res.push('invalid')
      else res.push(obj)
    }

    if (!res.length) return ['invalid']

    return res
  } catch (e) {
    return 'parse-error'
  }
}
