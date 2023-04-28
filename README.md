<div align="center">

# rpc

[![nest badge][nest-badge]](https://nest.land/package/rpc) [![][docs-badge]][docs] [![][code-quality-img]][code-quality]

</div>

 JSONRPC server router for Deno using native WebSocket, based on [jsonrpc](https://github.com/Vehmloewff/jsonrpc).

## Features

- No dependencies
- Typed parameters

## Example

```ts
import { App } from 'https://x.nest.land/rpc/mod.ts'

const app = new App()

app.method<[string]>('hello', (params) => {
  return `Hello ${params[0]}`
})

app.listen({ port: 8080, hostname: '0.0.0.0' })
```

[docs-badge]: https://img.shields.io/github/v/release/deno-libs/rpc?label=Docs&logo=deno&style=for-the-badge&color=black
[docs]: https://doc.deno.land/https/deno.land/x/rpc/mod.ts
[code-quality-img]: https://img.shields.io/codefactor/grade/github/deno-libs/rpc?style=for-the-badge&color=black&
[code-quality]: https://www.codefactor.io/repository/github/deno-libs/rpc
[nest-badge]: https://img.shields.io/badge/publushed%20on-nest.land-black?style=for-the-badge
