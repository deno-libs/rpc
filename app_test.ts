import { App } from './app.ts'
import { assert, assertEquals } from '@std/assert'
import { delay } from './utils.ts'

const sanitize = { sanitizeOps: false, sanitizeResources: false }

function startServer(
  app: App,
  port: number,
): Promise<{ close: () => void }> {
  return new Promise((resolve) => {
    const controller = new AbortController()
    Deno.serve(
      {
        port,
        signal: controller.signal,
        onListen: () =>
          resolve({
            close: () => {
              try {
                controller.abort()
              } catch {
                // ignore abort errors
              }
            },
          }),
      },
      (req) => app.handle(req) || new Response(null, { status: 400 }),
    )
  })
}

function connectClient(
  port: number,
  protocol?: string,
): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const ws = protocol
      ? new WebSocket(`ws://localhost:${port}`, protocol)
      : new WebSocket(`ws://localhost:${port}`)
    ws.onopen = () => resolve(ws)
    ws.onerror = (e) => reject(e)
  })
}

function waitForMessage(ws: WebSocket): Promise<string> {
  return new Promise((resolve) => {
    ws.onmessage = (e) => resolve(e.data)
  })
}

Deno.test('App constructor', async (t) => {
  await t.step('defaults path to "/"', () => {
    const app = new App()
    assertEquals(app.options.path, '/')
  })
  await t.step('accepts custom options', () => {
    const app = new App({ path: '/rpc', timeout: 5000 })
    assertEquals(app.options.path, '/rpc')
    assertEquals(app.options.timeout, 5000)
  })
})

Deno.test('App.method', () => {
  const app = new App()
  app.method('hello', ([name]: [string]) => `Hello ${name}`)
  assert(app.methods.has('hello'))
})

Deno.test('App.close without listen', () => {
  const app = new App()
  app.close()
})

Deno.test(
  'App.listen and close',
  sanitize,
  async () => {
    const app = new App({ timeout: 500 })
    app.method('ping', () => 'pong')

    let listenAddr: Deno.NetAddr | undefined
    app.listen({ port: 9200 }, (addr) => {
      listenAddr = addr
    })

    await delay(50)
    assert(listenAddr)
    assertEquals(listenAddr!.port, 9200)

    const ws = await connectClient(9200)
    const msgPromise = waitForMessage(ws)
    ws.send(
      JSON.stringify({
        jsonrpc: '2.0',
        method: 'ping',
        params: [],
        id: '1',
      }),
    )
    const response = JSON.parse(await msgPromise)
    assertEquals(response.result, 'pong')

    ws.close()
    await delay(50)
    app.close()
    await delay(50)
  },
)

Deno.test(
  'App.handle - method call',
  sanitize,
  async () => {
    const app = new App({ timeout: 500 })
    app.method('hello', ([name]: [string]) => `Hello ${name}`)

    const server = await startServer(app, 9100)

    try {
      const ws = await connectClient(9100)
      const msgPromise = waitForMessage(ws)

      ws.send(
        JSON.stringify({
          jsonrpc: '2.0',
          method: 'hello',
          params: ['world'],
          id: '1',
        }),
      )

      const response = JSON.parse(await msgPromise)
      assertEquals(response.result, 'Hello world')
      assertEquals(response.id, '1')
      assertEquals(response.jsonrpc, '2.0')

      ws.close()
      await delay(50)
    } finally {
      server.close()
      await delay(50)
    }
  },
)

Deno.test(
  'App.handle - method call without params',
  sanitize,
  async () => {
    const app = new App({ timeout: 500 })
    app.method('noop', () => 'ok')

    const server = await startServer(app, 9118)

    try {
      const ws = await connectClient(9118)
      const msgPromise = waitForMessage(ws)

      ws.send(
        JSON.stringify({
          jsonrpc: '2.0',
          method: 'noop',
          id: '11',
        }),
      )

      const response = JSON.parse(await msgPromise)
      assertEquals(response.result, 'ok')

      ws.close()
      await delay(50)
    } finally {
      server.close()
      await delay(50)
    }
  },
)

Deno.test(
  'App.handle - method not found',
  sanitize,
  async () => {
    const app = new App({ timeout: 500 })

    const server = await startServer(app, 9101)

    try {
      const ws = await connectClient(9101)
      const msgPromise = waitForMessage(ws)

      ws.send(
        JSON.stringify({
          jsonrpc: '2.0',
          method: 'nonexistent',
          params: [],
          id: '2',
        }),
      )

      const response = JSON.parse(await msgPromise)
      assertEquals(response.error.code, -32601)
      assertEquals(response.error.message, 'Method not found')

      ws.close()
      await delay(50)
    } finally {
      server.close()
      await delay(50)
    }
  },
)

Deno.test(
  'App.handle - parse error',
  sanitize,
  async () => {
    const app = new App({ timeout: 500 })

    const server = await startServer(app, 9102)

    try {
      const ws = await connectClient(9102)
      const msgPromise = waitForMessage(ws)

      ws.send('not valid json')

      const response = JSON.parse(await msgPromise)
      assertEquals(response.error.code, -32700)
      assertEquals(response.error.message, 'Parse error')

      ws.close()
      await delay(50)
    } finally {
      server.close()
      await delay(50)
    }
  },
)

Deno.test(
  'App.handle - invalid request',
  sanitize,
  async () => {
    const app = new App({ timeout: 500 })

    const server = await startServer(app, 9103)

    try {
      const ws = await connectClient(9103)
      const msgPromise = waitForMessage(ws)

      ws.send(JSON.stringify({ method: 'hello' }))

      const response = JSON.parse(await msgPromise)
      assertEquals(response.error.code, -32600)
      assertEquals(response.error.message, 'Invalid Request')

      ws.close()
      await delay(50)
    } finally {
      server.close()
      await delay(50)
    }
  },
)

Deno.test(
  'App.handle - emitter',
  sanitize,
  async () => {
    const app = new App({ timeout: 500 })

    app.emitters.set('stream:', (params, emit, _clientId) => {
      emit(`data: ${params[0]}`)
    })

    const server = await startServer(app, 9104)

    try {
      const ws = await connectClient(9104)
      const msgPromise = waitForMessage(ws)

      ws.send(
        JSON.stringify({
          jsonrpc: '2.0',
          method: 'stream:',
          params: ['test'],
          id: '3',
        }),
      )

      const response = JSON.parse(await msgPromise)
      assertEquals(response.result, 'data: test')
      assertEquals(response.id, '3')

      ws.close()
      await delay(50)
    } finally {
      server.close()
      await delay(50)
    }
  },
)

Deno.test(
  'App.handle - emitter not found',
  sanitize,
  async () => {
    const app = new App({ timeout: 500 })

    const server = await startServer(app, 9105)

    try {
      const ws = await connectClient(9105)
      const msgPromise = waitForMessage(ws)

      ws.send(
        JSON.stringify({
          jsonrpc: '2.0',
          method: 'missing:',
          params: [],
          id: '4',
        }),
      )

      const response = JSON.parse(await msgPromise)
      assertEquals(response.error.code, -32601)
      assertEquals(response.error.message, 'Emitter not found')

      ws.close()
      await delay(50)
    } finally {
      server.close()
      await delay(50)
    }
  },
)

Deno.test(
  'App.handle - emitter call without params',
  sanitize,
  async () => {
    const app = new App({ timeout: 500 })
    app.emitters.set('emit:', (_params, emit) => {
      emit('done')
    })

    const server = await startServer(app, 9119)

    try {
      const ws = await connectClient(9119)
      const msgPromise = waitForMessage(ws)

      ws.send(
        JSON.stringify({
          jsonrpc: '2.0',
          method: 'emit:',
          id: '12',
        }),
      )

      const response = JSON.parse(await msgPromise)
      assertEquals(response.result, 'done')

      ws.close()
      await delay(50)
    } finally {
      server.close()
      await delay(50)
    }
  },
)

Deno.test(
  'App.handle - clientAdded returning string',
  sanitize,
  async () => {
    const app = new App({
      timeout: 500,
      clientAdded: async () => 'custom-id',
    })
    app.method('ping', () => 'pong')

    const server = await startServer(app, 9106)

    try {
      const ws = await connectClient(9106)
      const msgPromise = waitForMessage(ws)

      ws.send(
        JSON.stringify({
          jsonrpc: '2.0',
          method: 'ping',
          params: [],
          id: '5',
        }),
      )

      const response = JSON.parse(await msgPromise)
      assertEquals(response.result, 'pong')
      assert(app.socks.has('custom-id'))

      ws.close()
      await delay(50)
    } finally {
      server.close()
      await delay(50)
    }
  },
)

Deno.test(
  'App.handle - clientAdded returning null',
  sanitize,
  async () => {
    const app = new App({
      timeout: 500,
      clientAdded: async () => null,
    })
    app.method('ping', () => 'pong')

    const server = await startServer(app, 9107)

    try {
      const ws = await connectClient(9107)
      const msgPromise = waitForMessage(ws)

      ws.send(
        JSON.stringify({
          jsonrpc: '2.0',
          method: 'ping',
          params: [],
          id: '6',
        }),
      )

      const response = JSON.parse(await msgPromise)
      assertEquals(response.result, 'pong')

      ws.close()
      await delay(50)
    } finally {
      server.close()
      await delay(50)
    }
  },
)

Deno.test(
  'App.handle - clientAdded returning error',
  sanitize,
  async () => {
    const app = new App({
      timeout: 500,
      clientAdded: async () => ({
        error: { code: 403, message: 'Forbidden' },
      }),
    })

    const server = await startServer(app, 9108)

    try {
      const ws = await connectClient(9108)
      const msgPromise = waitForMessage(ws)

      const response = JSON.parse(await msgPromise)
      assertEquals(response.error.code, 403)
      assertEquals(response.error.message, 'Forbidden')

      const closed = new Promise<void>((resolve) => {
        ws.onclose = () => resolve()
      })
      await closed
    } finally {
      server.close()
      await delay(50)
    }
  },
)

Deno.test(
  'App.handle - clientRemoved callback',
  sanitize,
  async () => {
    let removedId = ''
    const app = new App({
      timeout: 500,
      clientAdded: async () => 'remove-test',
      clientRemoved: async (id) => {
        removedId = id
      },
    })

    const server = await startServer(app, 9109)

    try {
      const ws = await connectClient(9109)
      await delay(50)
      ws.close()
      await delay(100)
      assertEquals(removedId, 'remove-test')
    } finally {
      server.close()
      await delay(50)
    }
  },
)

Deno.test(
  'App.handle - protocol header decodes params',
  sanitize,
  async () => {
    let receivedParams: unknown = null
    const app = new App({
      timeout: 500,
      clientAdded: async (params) => {
        receivedParams = params
        return 'proto-test'
      },
    })
    app.method('ping', () => 'pong')

    const server = await startServer(app, 9110)

    try {
      const { paramsEncoder } = await import('./utils.ts')
      const encoded = paramsEncoder.encrypt(
        JSON.stringify({ token: 'abc' }),
      )
      const ws = await connectClient(9110, encoded)
      await delay(50)

      assertEquals(typeof receivedParams, 'object')

      ws.close()
      await delay(50)
    } finally {
      server.close()
      await delay(50)
    }
  },
)

Deno.test(
  'App.handle - batch request',
  sanitize,
  async () => {
    const app = new App({ timeout: 500 })
    app.method('add', ([a, b]: [number, number]) => a + b)

    const server = await startServer(app, 9111)

    try {
      const ws = await connectClient(9111)
      const msgPromise = waitForMessage(ws)

      ws.send(
        JSON.stringify([
          { jsonrpc: '2.0', method: 'add', params: [1, 2], id: 'a' },
          { jsonrpc: '2.0', method: 'add', params: [3, 4], id: 'b' },
        ]),
      )

      const response = JSON.parse(await msgPromise)
      assert(Array.isArray(response))
      assertEquals(response.length, 2)

      ws.close()
      await delay(50)
    } finally {
      server.close()
      await delay(50)
    }
  },
)

Deno.test(
  'App.handle - async method',
  sanitize,
  async () => {
    const app = new App({ timeout: 500 })
    app.method('async-hello', async ([name]: [string]) => {
      await delay(10)
      return `Hello ${name}`
    })

    const server = await startServer(app, 9112)

    try {
      const ws = await connectClient(9112)
      const msgPromise = waitForMessage(ws)

      ws.send(
        JSON.stringify({
          jsonrpc: '2.0',
          method: 'async-hello',
          params: ['async'],
          id: '7',
        }),
      )

      const response = JSON.parse(await msgPromise)
      assertEquals(response.result, 'Hello async')

      ws.close()
      await delay(50)
    } finally {
      server.close()
      await delay(50)
    }
  },
)

Deno.test(
  'App.handle - no protocol header',
  sanitize,
  async () => {
    const app = new App({ timeout: 500 })
    app.method('ping', () => 'pong')

    const server = await startServer(app, 9113)

    try {
      const ws = await connectClient(9113)
      const msgPromise = waitForMessage(ws)

      ws.send(
        JSON.stringify({
          jsonrpc: '2.0',
          method: 'ping',
          params: [],
          id: '8',
        }),
      )

      const response = JSON.parse(await msgPromise)
      assertEquals(response.result, 'pong')

      ws.close()
      await delay(50)
    } finally {
      server.close()
      await delay(50)
    }
  },
)

Deno.test(
  'App.handle - socket onerror with Error instance',
  sanitize,
  async () => {
    const app = new App({
      timeout: 500,
      clientAdded: async () => 'err-test',
    })
    app.method('ping', () => 'pong')

    const server = await startServer(app, 9115)

    try {
      const ws = await connectClient(9115)
      await delay(50)

      const serverSocket = app.socks.get('err-test')!
      serverSocket.onerror!(new Error('mock error') as unknown as Event)
      await delay(50)

      ws.close()
      await delay(50)
    } finally {
      server.close()
      await delay(50)
    }
  },
)

Deno.test(
  'App.handle - socket onerror with non-Error event',
  sanitize,
  async () => {
    const app = new App({
      timeout: 500,
      clientAdded: async () => 'err-test2',
    })
    app.method('ping', () => 'pong')

    const server = await startServer(app, 9116)

    try {
      const ws = await connectClient(9116)
      await delay(50)

      const serverSocket = app.socks.get('err-test2')!
      serverSocket.onerror!(new Event('error'))
      await delay(50)

      ws.close()
      await delay(50)
    } finally {
      server.close()
      await delay(50)
    }
  },
)

Deno.test(
  'App.handle - binary message is ignored',
  sanitize,
  async () => {
    const app = new App({ timeout: 500 })
    app.method('ping', () => 'pong')

    const server = await startServer(app, 9114)

    try {
      const ws = await connectClient(9114)

      ws.send(new Uint8Array([1, 2, 3]).buffer)
      await delay(50)

      const msgPromise = waitForMessage(ws)
      ws.send(
        JSON.stringify({
          jsonrpc: '2.0',
          method: 'ping',
          params: [],
          id: '9',
        }),
      )
      const response = JSON.parse(await msgPromise)
      assertEquals(response.result, 'pong')

      ws.close()
      await delay(50)
    } finally {
      server.close()
      await delay(50)
    }
  },
)
