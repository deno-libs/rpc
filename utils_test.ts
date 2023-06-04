import { delay, lazyJSONParse, pathsAreEqual } from './utils.ts'
import { assertEquals, assert } from 'https://deno.land/std@0.190.0/testing/asserts.ts'

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
