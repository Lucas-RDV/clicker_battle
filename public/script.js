let playerIndex = null
let clickCount = 0
let ws = null

const gameStatus = document.getElementById("Status")
const timer = document.getElementById("timer")
const clicks = document.getElementById("clicks")
const clickBtn = document.getElementById("clickBtn")
const player = document.getElementById("player")
const readyBtn = document.getElementById("readyBtn")
const playAgainBtn = document.getElementById("playAgainBtn")
const reconnectBtn = document.getElementById("reconnectBtn")
const badBtn = document.getElementById("badBtn")
const doubleBtn = document.getElementById("doubleBtn")
const gameZone = document.querySelector(".game-zone");

const sizes = ["40px", "60px", "80px", "100px"];

function getRandomPosition(button) {
  const zoneRect = gameZone.getBoundingClientRect()
  const btnWidth = button.offsetWidth
  const btnHeight = button.offsetHeight
  const maxLeft = zoneRect.width - btnWidth
  const maxTop = zoneRect.height - btnHeight
  return {
    left: Math.random() * maxLeft,
    top: Math.random() * maxTop
  }
}

function moveAndResizeButton(button) {
  const size = sizes[Math.floor(Math.random() * sizes.length)]

  button.style.width = size
  button.style.height = size
  button.style.fontSize = (parseInt(size) / 3) + "px"
  button.style.lineHeight = size

  const pos = getRandomPosition(button)
  button.style.left = `${pos.left}px`
  button.style.top = `${pos.top}px`
}

function hideExtraButtons() {
  badBtn.classList.add("hidden")
  doubleBtn.classList.add("hidden")
}

function resetButtonsAfterClick() {
  clickBtn.classList.remove("hidden")
  moveAndResizeButton(clickBtn)

  hideExtraButtons()
  
  if (Math.random() < 0.4) { 
    badBtn.classList.remove("hidden")
    moveAndResizeButton(badBtn)
  }

  if (Math.random() < 0.3) {
    doubleBtn.classList.remove("hidden")
    moveAndResizeButton(doubleBtn)
  }
}

clickBtn.addEventListener("click", () => {
  ws?.send(JSON.stringify({ type: "click" }))
  clickCount++
  clicks.textContent = "Cliques: " + clickCount

  resetButtonsAfterClick()
})

badBtn.addEventListener("click", () => {
  ws?.send(JSON.stringify({ type: "badClick" }))
  clickCount--
  clicks.textContent = "Cliques: " + clickCount

  resetButtonsAfterClick()
})

doubleBtn.addEventListener("click", () => {
  ws?.send(JSON.stringify({ type: "doubleClick" }))
  clickCount+=2
  clicks.textContent = "Cliques: " + clickCount

  resetButtonsAfterClick()
})

readyBtn.addEventListener("click", () => {
  ws?.send(JSON.stringify({ type: "ready" }))
  readyBtn.disabled = true
})

playAgainBtn.addEventListener("click", () => {
  ws?.send(JSON.stringify({ type: "play_again" }))
  playAgainBtn.disabled = true
})

reconnectBtn.addEventListener("click", () => {
  reconnectBtn.classList.add("hidden")
  gameStatus.textContent = "Tentando conectar..."
  connectWebSocket()
})

const connectWebSocket = () => {
  ws = new WebSocket("ws://localhost:8080")

  ws.onopen = () => {
    gameStatus.textContent = "Conectado. Aguardando oponente..."
  }

  ws.onmessage = (msg) => {
    const data = JSON.parse(msg.data)

    switch (data.type) {
      case "connection_success":
        playerIndex = data.player + 1
        player.textContent = "Conectado como jogador " + playerIndex + "."
        gameStatus.textContent = "Aguardando oponente..."
        reconnectBtn.classList.add("hidden")
        break

      case "start":
        clickCount = 0
        clickBtn.disabled = false
        clicks.textContent = "Cliques: 0"
        gameStatus.textContent = "Clique o mais rápido que puder!"
        break

      case "waiting_ready":
        gameStatus.textContent = "Ambos conectados. Aguarde até que todos estejam prontos."
        readyBtn.disabled = false
        playAgainBtn.classList.add("hidden")
        readyBtn.classList.remove("hidden")
        clickCount = 0
        clicks.textContent = ""
        timer.textContent = ""
        break

      case "timer":
        timer.textContent = "Tempo restante: " + data.duration + "s"
        break

      case "end":
        clickBtn.disabled = true
        playAgainBtn.disabled = false
        playAgainBtn.classList.remove("hidden")
        clickBtn.classList.add("hidden")
        badBtn.classList.add("hidden")
        doubleBtn.classList.add("hidden")
        timer.textContent = ""
        clicks.textContent = "Você clicou " + data.points[playerIndex - 1] + " vezes."

        if (playerIndex == data.result && data.result !== "empate") {
          gameStatus.textContent = "Você venceu!"
        } else if (playerIndex != data.result && data.result !== "empate") {
          gameStatus.textContent = "Você perdeu!"
        } else if (data.result === "empate") {
          gameStatus.textContent = "O jogo empatou!"
        }
        break

      case "ready_ack":
        gameStatus.textContent = "Aguardando oponente..."
        break

      case "countdown":
        gameStatus.textContent = "Preparar... " + data.number
        readyBtn.classList.add("hidden")
        clickBtn.classList.remove("hidden")
        badBtn.classList.add("hidden")
        doubleBtn.classList.add("hidden")
        clickBtn.disabled = true

        moveAndResizeButton(clickBtn)
        break

      case "opponent_disconnected":
        gameStatus.textContent = "Oponente desconectou. Aguardando novo oponente..."
        clickBtn.classList.add("hidden")
        badBtn.classList.add("hidden")
        doubleBtn.classList.add("hidden")
        break

      case "error":
        if (data.message === "Sala cheia") {
          gameStatus.textContent = "Sala cheia. Tente mais tarde."
          reconnectBtn.classList.remove("hidden")
        }
        break
    }
  }

  ws.onclose = () => {
    reconnectBtn.classList.remove("hidden")
    clickBtn.classList.add("hidden")
    badBtn.classList.add("hidden")
    doubleBtn.classList.add("hidden")
    readyBtn.classList.add("hidden")
    playAgainBtn.classList.add("hidden")
  }
}

connectWebSocket()
