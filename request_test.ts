import { parseRequest, send } from './request.ts'
import { assertEquals } from '@std/assert'

Deno.test('parseRequest', async (t) => {
  await t.step('Returns an error if not object', () => {
    assertEquals(parseRequest('i am text'), 'parse-error')
  })
  await t.step('Marks as invalid if empty array', () => {
    assertEquals(parseRequest('[]'), ['invalid'])
  })
  await t.step('Marks as invalid if not array of objects', () => {
    assertEquals(parseRequest('["i am text"]'), ['invalid'])
  })
  await t.step('Marks as invalid if version is not 2.0', () => {
    assertEquals(parseRequest(JSON.stringify({ method: 'hello' })), ['invalid'])
    assertEquals(
      parseRequest(JSON.stringify({ method: 'hello', jsonrpc: '1.0' })),
      ['invalid'],
    )
  })
  await t.step('Marks as invalid if method is missing', () => {
    assertEquals(parseRequest(JSON.stringify({ jsonrpc: '2.0' })), ['invalid'])
  })
  await t.step('Properly parses valid request', () => {
    const response = { jsonrpc: '2.0', method: 'hello' }
    assertEquals(parseRequest(JSON.stringify(response)), [response])
  })
})

Deno.test('send', async (t) => {
  await t.step('sends a single message with jsonrpc version', () => {
    const sent: string[] = []
    const socket = { send: (data: string) => sent.push(data) } as unknown as WebSocket
    send(socket, { id: '1', result: 'ok' })
    assertEquals(sent.length, 1)
    assertEquals(JSON.parse(sent[0]), {
      id: '1',
      result: 'ok',
      jsonrpc: '2.0',
    })
  })
  await t.step('sends batch messages as array', () => {
    const sent: string[] = []
    const socket = { send: (data: string) => sent.push(data) } as unknown as WebSocket
    send(socket, [
      { id: '1', result: 'a' },
      { id: '2', result: 'b' },
    ])
    assertEquals(sent.length, 1)
    const parsed = JSON.parse(sent[0])
    assertEquals(parsed.length, 2)
    assertEquals(parsed[0].jsonrpc, '2.0')
    assertEquals(parsed[1].jsonrpc, '2.0')
  })
  await t.step('sends empty array for zero messages', () => {
    const sent: string[] = []
    const socket = { send: (data: string) => sent.push(data) } as unknown as WebSocket
    send(socket, [])
    assertEquals(sent.length, 1)
    assertEquals(JSON.parse(sent[0]), [])
  })
})
