const WebSocket = require("ws")
const http = require("http")
const fs = require("fs")
const path = require("path")

const PORT = process.env.PORT || 3000
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

const server = new WebSocket.Server({ server: httpServer })

httpServer.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`)
})

let connections = []
let points = [0, 0]
let duration = 30
let interval = null
let countdownInterval = null
let ready = [false, false]
let gameStarted = false
let playAgain = [false, false]

const getActiveConnections = () =>
  connections.filter((c) => c && c.readyState === WebSocket.OPEN)


const startGame = () => {
  gameStarted = true
  duration = 30
  points = [0, 0]
  ready = [false, false]

  connections.forEach((c) => c.send(JSON.stringify({ type: "start" })))

  interval = setInterval(() => {
    duration--
    connections.forEach((c) => {
      if (c && c.readyState === WebSocket.OPEN) {
        c.send(JSON.stringify({ type: "timer", duration }))
      }
    }
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
        if (c && c.readyState === WebSocket.OPEN) {
          c.send(
            JSON.stringify({
              type: "end",
              points,
              result,
            })
          )
        }
      })

      points = [0, 0]
      gameStarted = false
      ready = [false, false]
    }
  }, 1000)
}

server.on("connection", (ws) => {
  if (getActiveConnections().length >= 2) {
    ws.send(
      JSON.stringify({ type: "error", message: "Sala cheia" })
    )
    ws.close()
    return
  }

  let indexToUse = connections.findIndex((c) => !c || c.readyState !== WebSocket.OPEN)
  indexToUse = indexToUse !== -1 ? indexToUse : connections.length
  connections[indexToUse] = ws

  ws.send(JSON.stringify({ type: "connection_success", player: indexToUse }))

  ws.on("message", (msg) => {
    const data = JSON.parse(msg)
    switch (data.type) {
      case "ready":
        ready[indexToUse] = true
        connections[indexToUse].send(JSON.stringify({ type: "ready_ack" }))

        if (ready[0] && ready[1]) {
          let count = 3

          countdownInterval = setInterval(() => {
            connections.forEach((c) => {
              if (c && c.readyState === WebSocket.OPEN) {
                c.send(JSON.stringify({ type: "countdown", number: count }))
              }
            }
            )
            count--

            if (count < 0) {
              clearInterval(countdownInterval)
              startGame()
            }
          }, 1000)
        }
        break

      case "play_again":
        playAgain[indexToUse] = true

        if (playAgain[0] && playAgain[1]) {
          ready = [false, false]
          playAgain = [false, false]
          gameStarted = false
          points = [0, 0]
          duration = 10

          connections.forEach(c => {
            if (c && c.readyState === WebSocket.OPEN) {
              c.send(JSON.stringify({ type: "waiting_ready" }))
            }
          })
        }
        break

      case "click":
        points[indexToUse]++
        break

      case "doubleClick":
        points[indexToUse] += 2
        break

      case "badClick":
        points[indexToUse]--
        break
    }
  })

  ws.on("close", () => {
    console.log(`Jogador ${indexToUse + 1} desconectado.`)
    connections[indexToUse] = null
    ready = [false, false]
    playAgain[indexToUse] = false
    gameStarted = false

    if (interval) {
      clearInterval(interval)
      interval = null
    }
    if (countdownInterval) {
      clearInterval(countdownInterval)
      countdownInterval = null
    }
    gameStarted = false
    points = [0, 0]
    duration = 10

    connections.forEach((c, i) => {
      if (c && c.readyState === WebSocket.OPEN && i !== indexToUse) {
        c.send(JSON.stringify({ type: "opponent_disconnected" }))
      }
    })
  })


  if (connections.length === 2 && !gameStarted) {
    connections.forEach((c) =>
      c.send(JSON.stringify({ type: "waiting_ready" }))
    )
  }
})
