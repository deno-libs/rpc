import { lazyJSONParse } from '../utils.ts'

const socket = new WebSocket('ws://localhost:8080')

socket.onopen = () => {
  if (socket.readyState === socket.OPEN) {
    socket.send(
      JSON.stringify({ method: 'hello', params: ['world'], jsonrpc: '2.0' }),
    )
  }
}

socket.onmessage = (ev) => {
  console.log(lazyJSONParse(ev.data))
  socket.close()
}
