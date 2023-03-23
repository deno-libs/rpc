export interface JsonRpcRequest<T extends unknown[] = unknown[]> {
  method: string
  id?: string
  params: T
}

export type ClientAdded = <T extends unknown[] = unknown[]>(
  params: T,
  socket: WebSocket,
) => Promise<{ error: ErrorResponse } | string | null>

export interface RPCOptions {
  /**
   * Creates an ID for a specific client.
   *
   * If `{ error: ErrorResponse }` is returned, the client will be sent that error and the connection will be closed.
   *
   * If a `string` is returned, it will become the client's ID
   *
   * If `null` is returned, or if this function is not specified, the `clientId` will be set to a uuid
   */
  clientAdded?: ClientAdded
  /**
   * Called when a socket is closed.
   */
  clientRemoved?(clientId: string): Promise<void> | void
  /**
   * The path to listen for connections at.
   * If '*' is specified, all incoming ws requests will be used
   * @default '/' // upgrade all connections
   */
  path: string
  /**
   * Timeout
   */
  timeout?: number
}

export interface ErrorResponse<T extends unknown[] = unknown[]> {
  code: number
  message: string
  data?: T
}


export type Message = { jsonrpc?: string } & Record<string, unknown>