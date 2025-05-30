let playerIndex = null
let clickCount = 0
let ws = null

const gameStatus = document.getElementById("Status")
const clicks = document.getElementById("clicks")
const clickBtn = document.getElementById("clickBtn")
const player = document.getElementById("player")
const readyBtn = document.getElementById("readyBtn")
const playAgainBtn = document.getElementById("playAgainBtn")
const reconnectBtn = document.getElementById("reconnectBtn")
const badBtn = document.getElementById("badBtn")
const doubleBtn = document.getElementById("doubleBtn")
const gameZone = document.querySelector(".game-zone")

const sizes = ["40px", "60px", "80px", "100px"]
let totalGameTime = 30
let lastDuration = 30

let overdriveAudio = new Audio("sounds/Overdrive.wav")
overdriveAudio.loop = true
overdriveAudio.volume = 0.2

function updateTimerBar(duration) {
  lastDuration = duration;
  const percent = (duration / totalGameTime) * 100;
  document.getElementById("progressBar").style.width = `${percent}%`;
}

function playSound(audioFilePath) {
  const audio = new Audio(audioFilePath)
  audio.volume = 1
  audio.currentTime = 0
  audio.play().catch(e => {
    console.warn('Erro ao tocar som:', e)
  })
}

function fadeOutAudio(audio, duration = 1000) {
  const step = 50
  const fadeStep = audio.volume / (duration / step)
  const interval = setInterval(() => {
    if (audio.volume > fadeStep) {
      audio.volume -= fadeStep
    } else {
      audio.volume = 0
      audio.pause()
      audio.currentTime = 0
      clearInterval(interval)
    }
  }, step)
}

function triggerEffect(element, effectClass) {
  element.classList.add(effectClass)
  setTimeout(() => element.classList.remove(effectClass), 500)
}

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
  playSound("sounds/click.wav")
  ws?.send(JSON.stringify({ type: "click" }))
  clickCount++
  clicks.textContent = "Cliques: " + clickCount

  resetButtonsAfterClick()
})

badBtn.addEventListener("click", () => {
  playSound("sounds/bad.wav")
  triggerEffect(badBtn, "effect-hit")
  ws?.send(JSON.stringify({ type: "badClick" }))
  clickCount--
  clicks.textContent = "Cliques: " + clickCount

  resetButtonsAfterClick()
})

doubleBtn.addEventListener("click", () => {
  playSound("sounds/double.wav")
  triggerEffect(doubleBtn, "effect-bonus")
  ws?.send(JSON.stringify({ type: "doubleClick" }))
  clickCount += 2
  clicks.textContent = "Cliques: " + clickCount

  resetButtonsAfterClick()
})

readyBtn.addEventListener("click", () => {
  playSound("sounds/select.wav")
  ws?.send(JSON.stringify({ type: "ready" }))
  readyBtn.classList.add("confirmed");
})

playAgainBtn.addEventListener("click", () => {
  playSound("sounds/select.wav")
  ws?.send(JSON.stringify({ type: "play_again" }))
  playAgainBtn.classList.add("confirmed");
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
        overdriveAudio.currentTime = 0
        overdriveAudio.volume = 0.2
        overdriveAudio.play()
        totalGameTime = 30
        clickCount = 0
        clickBtn.disabled = false
        clicks.textContent = "Cliques: 0"
        gameStatus.textContent = "Clique o mais rápido que puder!"
        break

      case "waiting_ready":
        gameStatus.textContent = "Jogadores conectados. Aguarde até que todos estejam prontos."
        readyBtn.classList.remove("confirmed");
        playAgainBtn.classList.remove("confirmed");
        playAgainBtn.classList.add("hidden")
        readyBtn.classList.remove("hidden")
        clickCount = 0
        clicks.textContent = ".............."
        timer.textContent = ""
        break

      case "timer":
        updateTimerBar(data.duration)
        break

      case "end":
        fadeOutAudio(overdriveAudio, 1500)
        clickBtn.disabled = true
        playAgainBtn.classList.remove("hidden")
        clickBtn.classList.add("hidden")
        badBtn.classList.add("hidden")
        doubleBtn.classList.add("hidden")
        clicks.textContent = "Você clicou " + data.points[playerIndex - 1] + " vezes."

        if (playerIndex == data.result && data.result !== "empate") {
          playSound("sounds/win.wav")
          gameStatus.textContent = "Você venceu!"
        } else if (playerIndex != data.result && data.result !== "empate") {
          playSound("sounds/lose.wav")
          gameStatus.textContent = "Você perdeu!"
        } else if (data.result === "empate") {
          playSound("sounds/draw.wav")
          gameStatus.textContent = "O jogo empatou!"
        }
        break

      case "ready_ack":
        gameStatus.textContent = "Aguardando oponente..."
        break

      case "countdown":
          playSound("sounds/countdown.wav");
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
