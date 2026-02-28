import {
  delay,
  lazyJSONParse,
  makeArray,
  makeEncryptor,
  paramsEncoder,
  pathsAreEqual,
} from './utils.ts'
import { assert, assertEquals } from '@std/assert'

Deno.test('makeArray', async (t) => {
  await t.step('wraps a single value in an array', () => {
    assertEquals(makeArray(1), [1])
  })
  await t.step('returns an array as-is', () => {
    assertEquals(makeArray([1, 2]), [1, 2])
  })
})

Deno.test('makeEncryptor', async (t) => {
  await t.step('encrypt returns a hex string', () => {
    const { encrypt } = makeEncryptor('key')
    const result = encrypt('hi')
    assertEquals(typeof result, 'string')
    assert(result.length > 0)
  })
  await t.step('decrypt returns a string', () => {
    const { decrypt } = makeEncryptor('key')
    const result = decrypt('0a0b')
    assertEquals(typeof result, 'string')
  })
  await t.step('decrypt handles empty match', () => {
    const { decrypt } = makeEncryptor('key')
    const result = decrypt('')
    assertEquals(result, '')
  })
  await t.step('paramsEncoder encrypt and decrypt are callable', () => {
    const encrypted = paramsEncoder.encrypt('test')
    assertEquals(typeof encrypted, 'string')
    const decrypted = paramsEncoder.decrypt(encrypted)
    assertEquals(typeof decrypted, 'string')
  })
})

Deno.test('lazyJSONParse', async (t) => {
  await t.step('should parse JSON like JSON.parse', () => {
    assertEquals(lazyJSONParse('{ "a": "b" }'), JSON.parse('{ "a": "b" }'))
  })
  await t.step('should return an empty object on failed parse', () => {
    assertEquals(lazyJSONParse('{ "a": "b"'), {})
  })
})

Deno.test('pathsAreEqual', async (t) => {
  await t.step('if expected path is asterisk, return true', () => {
    assertEquals(pathsAreEqual('/hello', '*'), true)
  })
  await t.step('should assert equal paths', () => {
    assertEquals(pathsAreEqual('/hello', '/hello'), true)
  })
  await t.step('if nothing is expected, default to "/"', () => {
    assertEquals(pathsAreEqual('/'), true)
  })
})

Deno.test('delay', async (t) => {
  await t.step('it delays a function for given time', async () => {
    const then = performance.now()
    await delay(10)
    assert(performance.now() - then < 15) // there's extra run-time
  })
})
