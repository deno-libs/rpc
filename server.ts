import { parseRequest, send } from './request.ts'
import type { Parameters, RPCOptions } from './types.ts'
import { lazyJSONParse, paramsEncoder } from './utils.ts'

export class App {
  httpConn?: Deno.HttpConn
  listener?: Deno.Listener
  options: RPCOptions
  socks: Map<string, WebSocket>
  methods: Map<string, (params: Parameters, clientId: string) => Promise<any>>
  emitters: Map<string, (params: Parameters, emit: (data: any) => void, clientId: string) => void>
  timeout: number
  constructor(options: RPCOptions = { path: '/' }) {
    this.options = options
    this.socks = new Map()
    this.methods = new Map()
    this.emitters = new Map()
    this.timeout = options.timeout || 1000 * 60 * 60 * 24
  }
  /**
   * Upgrade a request to WebSocket and handle it
   * @param request request object
   * @returns response object
   */
  async handle(request: Request) {
    const { socket, response } = Deno.upgradeWebSocket(request)

    const protocolHeader = request.headers.get('sec-websocket-protocol')

    const incomingParamaters = protocolHeader ? lazyJSONParse(paramsEncoder.decrypt(protocolHeader)) : {}

    let clientId = await (this.options.clientAdded || (() => crypto.randomUUID()))(incomingParamaters, socket)

    if (!clientId) clientId = crypto.randomUUID()

    if (typeof clientId === 'object') {
      send(socket, { id: null, error: clientId.error })
      socket.close()
      return response
    }

    this.socks.set(clientId, socket)

    // Close the socket after timeout
    setTimeout(() => socket.close(), this.timeout)

    socket.onmessage = ({ data }) => {
      if (typeof data === 'string') {
        send(socket, this.handleRPCMethod(clientId as string, data))
      } else if (data instanceof Uint8Array) {
        console.warn('Warn: an invalid jsonrpc message was sent.  Skipping.')
      }
    }

    socket.onclose = async () => {
      if (this.options.clientRemoved) await this.options.clientRemoved(clientId as string)
      this.socks.delete(clientId as string)
    }

    socket.onerror = (err) => {
      if (err instanceof Error) console.log(err.message)
      if (socket.readyState !== socket.CLOSED) {
        socket.close(1000)
      }
    }

    return response
  }
  /**
   * Add a method handler
   * @param method method name
   * @param handler method handler
   */
  method(method: string, handler: (params: Parameters, clientId: string) => Promise<any>) {
    this.methods.set(method, handler)
  }

  /**
   * Handle a JSONRPC method
   * @param client client ID
   * @param data Received data
   */
  async handleRPCMethod(client: string, data: string) {
    const sock = this.socks.get(client)

    if (!sock) return console.warn(`Warn: recieved a request from and undefined connection`)

    const requests = parseRequest(data)
    if (requests === 'parse-error') return send(sock, { id: null, error: { code: -32700, message: 'Parse error' } })

    const responses: any[] = []

    const promises = requests.map(async (request) => {
      if (request === 'invalid')
        return responses.push({ id: null, error: { code: -32600, message: 'Invalid Request' } })

      if (!request.method.endsWith(':')) {
        const handler = this.methods.get(request.method)

        if (!handler)
          if (request.id !== undefined)
            return responses.push({ error: { code: -32601, message: 'Method not found' }, id: request.id })
          else return
        const result = await handler(request.params, client)

        if (request.id !== undefined) responses.push({ id: request.id, result })
      } else {
        // It's an emitter
        const handler = this.emitters.get(request.method)

        if (!handler)
          if (request.id !== undefined)
            return responses.push({ error: { code: -32601, message: 'Emitter not found' }, id: request.id })
          else return

        // Because emitters can return a value at any time, we are going to have to send messages on their schedule.
        // This may break batches, but I don't think that is a big deal
        handler(
          request.params,
          (data) => {
            send(sock, { result: data, id: request.id })
          },
          client
        )
      }
    })

    await Promise.all(promises)

    send(sock, responses)
  }

  /**
   * Start a websocket server and listen it on a specified host/port
   * @param options `Deno.listen` options
   * @param cb Callback that triggers after HTTP server is started
   */
  async listen(options: Deno.ListenOptions, cb?: () => void) {
    const listener = Deno.listen(options)

    const httpConn = Deno.serveHttp(await listener.accept())

    this.httpConn = httpConn
    this.listener = listener

    cb?.()

    const e = await httpConn.nextRequest()

    if (e) {
      e.respondWith(this.handle(e.request))
    }
  }
}
