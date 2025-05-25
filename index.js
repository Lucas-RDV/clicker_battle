const WebSocket = require("ws")
const http = require("http")
const fs = require("fs")
const path = require("path")

const server = new WebSocket.Server({ port: 8080 })
const httpServer = http.createServer((req, res) => {
  let filePath = path.join(__dirname, "public", req.url === "/" ? "index.html" : req.url)
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404)
      res.end("Arquivo não encontrado")
    } else {
      res.writeHead(200)
      res.end(data)
    }
  })
})

let connections = []
let points = [0, 0]
let duration = 10
let interval = null
let gameStarted = false

const startGame = () => {
  gameStarted = true
  duration = 10
  points = [0, 0]

  connections.forEach((c) => c.send(JSON.stringify({ type: "start" })))

  interval = setInterval(() => {
    duration--
    connections.forEach((c) =>
      c.send(JSON.stringify({ type: "timer", duration }))
    );

    if (duration <= 0) {
      clearInterval(interval)
      let result =
        points[0] === points[1]
          ? "empate"
          : points[0] > points[1]
          ? "1"
          : "2"

      connections.forEach((c, i) => {
        c.send(
          JSON.stringify({
            type: "end",
            points,
            result,
          })
        )
        c.close()
      })

      connections = []
      points = [0, 0]
      gameStarted = false
    }
  }, 1000)
}

server.on("connection", (ws) => {
  if (connections.length >= 2) {
    ws.send(
      JSON.stringify({ type: "error", message: "Sala cheia. Tente mais tarde." })
    )
    ws.close()
    return
  }

  const playerIndex = connections.length
  connections.push(ws)

  ws.send(JSON.stringify({ type: "connection_success", player: playerIndex }))

  ws.on("message", (msg) => {
    const data = JSON.parse(msg)
    if (data.type === "click" && gameStarted) {
      points[playerIndex]++
    }
  })

  ws.on("close", () => {
    console.log("Cliente desconectado")
  })

  if (connections.length === 2 && !gameStarted) {
    startGame()
  }
})

httpServer.listen(3000, () => {
  console.log("Servidor HTTP rodando em http://localhost:3000")
})
