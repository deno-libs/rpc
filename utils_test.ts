import { lazyJSONParse, pathsAreEqual } from './utils.ts'
import { assertEquals } from 'https://deno.land/std@0.162.0/testing/asserts.ts'

Deno.test('lazyJSONParse', async (it) => {
  await it.step('should parse JSON like JSON.parse', () => {
    assertEquals(lazyJSONParse('{ "a": "b" }'), JSON.parse('{ "a": "b" }'))
  })
  await it.step('should return an empty object on failed parse', () => {
    assertEquals(lazyJSONParse('{ "a": "b"'), {})
  })
})

Deno.test('pathsAreEqual', async (it) => {
  await it.step('if expected path is asterisk, return true', () => {
    assertEquals(pathsAreEqual('/hello', '*'), true)
  })
  await it.step('should assert equal paths', () => {
    assertEquals(pathsAreEqual('/hello', '/hello'), true)
  })
  await it.step('if nothing is expected, default to "/"', () => {
    assertEquals(pathsAreEqual('/'), true)
  })
})
