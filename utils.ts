export const makeArray = <T>(val: T | T[]) => (Array.isArray(val) ? val : [val])

export function makeEncryptor(key: string) {
  const textToChars = (text: string) => text.split('').map((c) => c.charCodeAt(0))
  const byteHex = (n: number) => ('0' + Number(n).toString(16)).substr(-2)
  const applyKeyToChar = (code: number) => textToChars(key).reduce((a, b) => a ^ b, code)

  function decrypt(encoded: string) {
    return (encoded.match(/.{1,2}/g) || [])
      .map((hex) => parseInt(hex, 16))
      .map(applyKeyToChar)
      .map((charCode) => String.fromCharCode(charCode))
      .join('')
  }

  function encrypt(text: string) {
    return textToChars(text).map(applyKeyToChar).map(byteHex).join('')
  }

  return { encrypt, decrypt }
}

export function lazyJSONParse(json: string): any {
  try {
    return JSON.parse(json)
  } catch {
    return {}
  }
}

export function delay(time: number) {
  return new Promise<void>((resolve) => {
    setTimeout(() => resolve(), time)
  })
}

export function pathsAreEqual(actual: string, expected: string | undefined) {
  if (expected === '*') return true
  return actual === (expected || '/')
}

export const paramsEncoder = makeEncryptor('nothing-secret')
