const WebSocket = require("ws")
const http = require("http")
const fs = require("fs")
const path = require("path")

const PORT = process.env.PORT || 3000
const INACTIVITY_TIMEOUT = 60000

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

let rooms = []
let nextRoomId = 1

function findOrCreateRoom(ws) {
  let room = rooms.find(r => r.players.length === 1)

  if (!room) {
    room = {
      id: nextRoomId++,
      players: [],
      points: [0, 0],
      ready: [false, false],
      playAgain: [false, false],
      gameStarted: false,
      duration: 30,
      interval: null,
      countdownInterval: null,
    }
    rooms.push(room)
  }

  const playerIndex = room.players.length
  room.players.push(ws)
  ws.room = room
  ws.playerIndex = playerIndex

  ws.send(JSON.stringify({ type: "connection_success", player: playerIndex, room: room.id  }))

  if (room.players.length === 2) {
    room.players.forEach(p => p.send(JSON.stringify({ type: "waiting_ready" })))
  }
}

function startGame(room) {
  room.gameStarted = true
  room.duration = 30
  room.points = [0, 0]
  room.ready = [false, false]

  room.players.forEach(p => p.send(JSON.stringify({ type: "start" })))

  room.interval = setInterval(() => {
    room.duration--
    room.players.forEach(p => {
      if (p.readyState === WebSocket.OPEN) {
        p.send(JSON.stringify({ type: "timer", duration: room.duration, points: room.points }))
      }
    })

    if (room.duration <= 0) {
      clearInterval(room.interval)
      const result = room.points[0] === room.points[1] ? "empate" : room.points[0] > room.points[1] ? "1" : "2"
      room.players.forEach((p, i) => {
        if (p.readyState === WebSocket.OPEN) {
          p.send(JSON.stringify({ type: "end", points: room.points, result }))
        }
      })
      room.ready = [false, false]
      room.gameStarted = false
    }
  }, 1000)
}

server.on("connection", (ws) => {
  findOrCreateRoom(ws)

  let inactivityTimer = setTimeout(() => ws.close(4000, "Inatividade"), INACTIVITY_TIMEOUT)

  const resetInactivityTimer = () => {
    clearTimeout(inactivityTimer)
    inactivityTimer = setTimeout(() => ws.close(4000, "Inatividade"), INACTIVITY_TIMEOUT)
  }

  ws.on("message", (msg) => {
    resetInactivityTimer()
    const data = JSON.parse(msg)
    const room = ws.room
    const index = ws.playerIndex

    switch (data.type) {
      case "ready":
        room.ready[index] = true
        ws.send(JSON.stringify({ type: "ready_ack" }))

        if (room.ready[0] && room.ready[1]) {
          let count = 3
          room.countdownInterval = setInterval(() => {
            room.players.forEach(p => {
              if (p.readyState === WebSocket.OPEN) {
                p.send(JSON.stringify({ type: "countdown", number: count }))
              }
            })
            count--
            if (count < 0) {
              clearInterval(room.countdownInterval)
              startGame(room)
            }
          }, 1000)
        }
        break

      case "play_again":
        room.playAgain[index] = true
        if (room.playAgain[0] && room.playAgain[1]) {
          room.ready = [false, false]
          room.playAgain = [false, false]
          room.points = [0, 0]
          room.duration = 30
          room.gameStarted = false
          room.players.forEach(p => p.send(JSON.stringify({ type: "waiting_ready" })))
        }
        break

      case "click":
        room.points[index]++
        break
      case "doubleClick":
        room.points[index] += 2
        break
      case "badClick":
        room.points[index]--
        break
    }
  })

  ws.on("close", () => {
    clearTimeout(inactivityTimer)
    const room = ws.room
    if (!room) return

    if (room.interval) clearInterval(room.interval)
    if (room.countdownInterval) clearInterval(room.countdownInterval)

    room.players.forEach((p, i) => {
      if (p !== ws && p.readyState === WebSocket.OPEN) {
        p.send(JSON.stringify({ type: "opponent_disconnected" }))
      }
    })

    rooms = rooms.filter(r => r !== room)
    room.players = room.players.filter(p => p !== ws)

    if (room.players.length === 0) {
      rooms = rooms.filter(r => r !== room)
    }
  })
})
