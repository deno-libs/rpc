# rpc

JSONRPC server implementation with native WebSocket, based on [jsonrpc](https://github.com/Vehmloewff/jsonrpc).

## Example

```ts
import { App } from 'https://x.nest.land/rpc/mod.ts'

const app = new App()

app.method('hello', (params) => {
  return `Hello ${params[0]}`
})

app.listen({ port: 8080, hostname: '0.0.0.0' })
```
