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
const gameZone = document.querySelector(".game-zone");

const moveAndResizeButton = () => {
  const sizes = ["40px", "60px", "80px", "100px"];
  const size = sizes[Math.floor(Math.random() * sizes.length)];

  clickBtn.style.width = size;
  clickBtn.style.height = size;
  clickBtn.style.fontSize = parseInt(size) / 3 + "px";
clickBtn.style.lineHeight = size;

  const zoneRect = gameZone.getBoundingClientRect();
  const maxLeft = zoneRect.width - parseInt(size);
  const maxTop = zoneRect.height - parseInt(size);

  const left = Math.random() * maxLeft;
  const top = Math.random() * maxTop;

  clickBtn.style.left = `${left}px`;
  clickBtn.style.top = `${top}px`;
}

clickBtn.addEventListener("click", () => {
  ws?.send(JSON.stringify({ type: "click" }))
  clickCount++
  clicks.textContent = "Cliques: " + clickCount

  moveAndResizeButton()
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
        clickBtn.disabled = true

        moveAndResizeButton()
        break

      case "opponent_disconnected":
        gameStatus.textContent = "Oponente desconectou. Aguardando novo oponente..."
        clickBtn.classList.add("hidden")
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
    readyBtn.classList.add("hidden")
    playAgainBtn.classList.add("hidden")
  }
}

connectWebSocket()
