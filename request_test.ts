import { parseRequest } from './request.ts'
import { assertEquals } from 'https://deno.land/std@0.190.0/testing/asserts.ts'

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
