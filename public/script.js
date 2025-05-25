const ws = new WebSocket("ws://localhost:8080")

let playerIndex = null
let clickCount = 0

const gameStatus = document.getElementById("Status")
const timer = document.getElementById("timer")
const clicks = document.getElementById("clicks")
const clickBtn = document.getElementById("clickBtn")
const player = document.getElementById("player")

clickBtn.disabled = true

clickBtn.addEventListener("click", () => {
  ws.send(JSON.stringify({ type: "click" }))
  clickCount++
  clicks.textContent = "Cliques: " + clickCount
})

ws.onmessage = (msg) => {
  const data = JSON.parse(msg.data)

  switch (data.type) {
    case "connection_success":
      playerIndex = data.player + 1
      console.log(playerIndex)
      player.textContent ="Conectado como jogador " + (playerIndex) + "."
      gameStatus.textContent = "Aguardando outro jogador..."
      break

    case "start":
      clickCount = 0
      clickBtn.disabled = false
      clicks.textContent = "Cliques: 0"
      gameStatus.textContent = "Clique o mais rápido que puder!"
      break

    case "timer":
      timer.textContent = "Tempo restante: " + data.duration + "s"
      break

    case "end":
        console.log(data.result)
      clickBtn.disabled = true
      timer.textContent = ""
      clicks.textContent = "Você clicou " + data.points[playerIndex -1]  + " vezes."
      if (playerIndex == data.result && data.result != "empate") {
          gameStatus.textContent = "Voce Venceu!"
      }else if (playerIndex != data.result && data.result != "empate") {
        gameStatus.textContent = "Voce Perdeu!"
      } else if (data.result == "empate") {
        gameStatus.textContent = "O jogo empatou!"
      }
      break

    case "error":
      alert(data.message)
      break
  }
}