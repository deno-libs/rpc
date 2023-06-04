import { App } from '../mod.ts'

const app = new App()

app.method<[string]>('hello', (params) => {
  return `Hello ${params[0]}`
})

await app.listen({ port: 8080, hostname: '0.0.0.0' }, (addr) => {
  console.log(`Listening on ${addr.port}`)
})
