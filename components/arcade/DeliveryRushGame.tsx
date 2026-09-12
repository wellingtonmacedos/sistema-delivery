'use client'

import { useEffect, useRef, useState } from 'react'

type Theme = {
  corPrimaria: string
  corBot: string
  corTexto: string
  corFundoChat: string
  logoUrl?: string | null
  nome?: string
}

export default function DeliveryRushGame({ onBack, theme }: { onBack: () => void; theme?: Theme }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [score, setScore] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [highScore, setHighScore] = useState(0)

  // Configurações
  const CANVAS_WIDTH = 300
  const CANVAS_HEIGHT = 500
  const LANE_WIDTH = CANVAS_WIDTH / 3
  const PLAYER_WIDTH = 40
  const PLAYER_HEIGHT = 70
  const OBSTACLE_SIZE = 40
  const ITEM_SIZE = 30

  // Estado
  const playerLaneRef = useRef(1) // 0, 1, 2
  const obstaclesRef = useRef<{ lane: number, y: number, type: 'car' | 'cone' }[]>([])
  const itemsRef = useRef<{ lane: number, y: number, type: 'burger' | 'pizza' }[]>([])
  const speedRef = useRef(5)
  const frameIdRef = useRef<number>(0)
  const isPlayingRef = useRef(false)
  const scoreRef = useRef(0)
  const highScoreRef = useRef(0)

  // Theme colors
  const bgColor = theme?.corFundoChat || '#111827'
  const textColor = theme?.corTexto || '#ffffff'
  const accentColor = theme?.corPrimaria || '#ffd23a' // Default yellow for Delivery
  const botColor = theme?.corBot || '#1f2937'

  useEffect(() => {
    const saved = localStorage.getItem('delivery_highscore')
    if (saved) {
      setHighScore(parseInt(saved))
      highScoreRef.current = parseInt(saved)
    }
  }, [])

  const startGame = () => {
    playerLaneRef.current = 1
    obstaclesRef.current = []
    itemsRef.current = []
    speedRef.current = 5
    scoreRef.current = 0
    setScore(0)
    setGameOver(false)
    setIsPlaying(true)
    isPlayingRef.current = true
    
    if (frameIdRef.current) cancelAnimationFrame(frameIdRef.current)
    gameLoop()
  }

  const gameLoop = () => {
    if (!isPlayingRef.current) return

    update()
    draw()
    frameIdRef.current = requestAnimationFrame(gameLoop)
  }

  const update = () => {
    // Spawn Logic
    if (Math.random() < 0.02) {
      // Spawn Obstacle
      const lane = Math.floor(Math.random() * 3)
      if (!obstaclesRef.current.some(o => o.lane === lane && o.y < 100)) {
        obstaclesRef.current.push({
          lane,
          y: -OBSTACLE_SIZE,
          type: Math.random() > 0.5 ? 'car' : 'cone'
        })
      }
    } else if (Math.random() < 0.03) {
      // Spawn Item
      const lane = Math.floor(Math.random() * 3)
      if (!itemsRef.current.some(i => i.lane === lane && i.y < 100) && 
          !obstaclesRef.current.some(o => o.lane === lane && o.y < 100)) {
        itemsRef.current.push({
          lane,
          y: -ITEM_SIZE,
          type: Math.random() > 0.5 ? 'burger' : 'pizza'
        })
      }
    }

    // Move objects
    obstaclesRef.current.forEach(o => o.y += speedRef.current)
    itemsRef.current.forEach(i => i.y += speedRef.current)

    // Remove off-screen
    obstaclesRef.current = obstaclesRef.current.filter(o => o.y < CANVAS_HEIGHT)
    itemsRef.current = itemsRef.current.filter(i => i.y < CANVAS_HEIGHT)

    // Collision Player-Obstacle
    const playerX = playerLaneRef.current * LANE_WIDTH + (LANE_WIDTH - PLAYER_WIDTH) / 2
    const playerY = CANVAS_HEIGHT - PLAYER_HEIGHT - 20

    obstaclesRef.current.forEach(o => {
      const obsX = o.lane * LANE_WIDTH + (LANE_WIDTH - OBSTACLE_SIZE) / 2
      if (
        playerX < obsX + OBSTACLE_SIZE &&
        playerX + PLAYER_WIDTH > obsX &&
        playerY < o.y + OBSTACLE_SIZE &&
        playerY + PLAYER_HEIGHT > o.y
      ) {
        endGame()
      }
    })

    // Collision Player-Item
    itemsRef.current.forEach((i, idx) => {
      const itemX = i.lane * LANE_WIDTH + (LANE_WIDTH - ITEM_SIZE) / 2
      if (
        playerX < itemX + ITEM_SIZE &&
        playerX + PLAYER_WIDTH > itemX &&
        playerY < i.y + ITEM_SIZE &&
        playerY + PLAYER_HEIGHT > i.y
      ) {
        // Collect
        itemsRef.current.splice(idx, 1)
        scoreRef.current += 50
        setScore(scoreRef.current)
        if (scoreRef.current > highScoreRef.current) {
          setHighScore(scoreRef.current)
          highScoreRef.current = scoreRef.current
          localStorage.setItem('delivery_highscore', scoreRef.current.toString())
        }
        // Increase speed slightly
        speedRef.current += 0.1
      }
    })
  }

  const endGame = () => {
    isPlayingRef.current = false
    setGameOver(true)
    setIsPlaying(false)
    cancelAnimationFrame(frameIdRef.current)
  }

  const draw = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Road
    ctx.fillStyle = '#333'
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

    // Lanes
    ctx.strokeStyle = '#fff'
    ctx.setLineDash([20, 20])
    ctx.beginPath()
    ctx.moveTo(LANE_WIDTH, 0)
    ctx.lineTo(LANE_WIDTH, CANVAS_HEIGHT)
    ctx.moveTo(LANE_WIDTH * 2, 0)
    ctx.lineTo(LANE_WIDTH * 2, CANVAS_HEIGHT)
    ctx.stroke()
    ctx.setLineDash([])

    // Player (Motorcycle/Car)
    const playerX = playerLaneRef.current * LANE_WIDTH + (LANE_WIDTH - PLAYER_WIDTH) / 2
    const playerY = CANVAS_HEIGHT - PLAYER_HEIGHT - 20
    
    ctx.fillStyle = accentColor // Use theme color
    ctx.fillRect(playerX, playerY, PLAYER_WIDTH, PLAYER_HEIGHT)
    // Headlight
    ctx.fillStyle = '#fff'
    ctx.fillRect(playerX + 5, playerY, PLAYER_WIDTH - 10, 10)

    // Obstacles
    obstaclesRef.current.forEach(o => {
      const obsX = o.lane * LANE_WIDTH + (LANE_WIDTH - OBSTACLE_SIZE) / 2
      ctx.fillStyle = o.type === 'car' ? '#ff0000' : '#ff8800'
      ctx.fillRect(obsX, o.y, OBSTACLE_SIZE, OBSTACLE_SIZE)
    })

    // Items
    itemsRef.current.forEach(i => {
      const itemX = i.lane * LANE_WIDTH + (LANE_WIDTH - ITEM_SIZE) / 2
      ctx.fillStyle = i.type === 'burger' ? '#00ff00' : '#ffff00'
      ctx.beginPath()
      ctx.arc(itemX + ITEM_SIZE/2, i.y + ITEM_SIZE/2, ITEM_SIZE/2, 0, Math.PI * 2)
      ctx.fill()
    })
  }

  const moveLane = (dir: -1 | 1) => {
    const newLane = playerLaneRef.current + dir
    if (newLane >= 0 && newLane <= 2) {
      playerLaneRef.current = newLane
    }
  }

  // Controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault()
      }

      if (!isPlayingRef.current) return
      if (e.key === 'ArrowLeft') moveLane(-1)
      if (e.key === 'ArrowRight') moveLane(1)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      cancelAnimationFrame(frameIdRef.current)
    }
  }, [])

  return (
    <div 
      className="flex flex-col items-center h-full min-h-0 p-4 transition-colors duration-300"
      style={{ backgroundColor: bgColor, color: textColor }}
    >
      <div className="flex justify-between w-full max-w-[300px] mb-4">
        <button 
          onClick={onBack} 
          className="px-4 py-2 rounded transition-opacity hover:opacity-80"
          style={{ backgroundColor: botColor, color: textColor }}
        >
          ← Voltar
        </button>
        <div className="text-xl font-bold">Score: {score}</div>
      </div>

      <div className="flex-1 min-h-0 w-full flex items-center justify-center">
        <div 
          className="relative border-4 rounded-lg overflow-hidden shadow-[0_0_20px_rgba(255,200,0,0.5)]"
          style={{ borderColor: accentColor, boxShadow: `0 0 20px ${accentColor}80` }}
        >
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className="bg-black block max-w-full"
            style={{ height: 'min(500px, 42vh)', width: 'auto', maxWidth: '100%' }}
          />
          
          {(!isPlaying || gameOver) && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80">
              <h2 
                className="text-3xl font-bold mb-4 font-mono text-center"
                style={{ color: accentColor }}
              >
                DELIVERY<br/>RUSH
              </h2>
              {gameOver && <div className="text-red-500 text-xl mb-4">GAME OVER</div>}
              <div className="text-gray-400 mb-8">Melhor Pontuação: {highScore}</div>
              <button 
                onClick={startGame} 
                className="text-white px-8 py-3 rounded-full text-xl font-bold transition-all transform hover:scale-105"
                style={{ backgroundColor: accentColor }}
              >
                {gameOver ? 'Tentar Novamente' : 'JOGAR'}
              </button>
            </div>
          )}
        </div>
      </div>

      {isPlaying && (
        <div className="mt-4 sm:mt-8 flex gap-6 sm:gap-8 shrink-0">
           <button 
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center text-3xl active:opacity-80 border-2"
            style={{ backgroundColor: botColor, color: textColor, borderColor: textColor }}
            onTouchStart={() => moveLane(-1)}
            onClick={() => moveLane(-1)}
           >←</button>
           <button 
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center text-3xl active:opacity-80 border-2"
            style={{ backgroundColor: botColor, color: textColor, borderColor: textColor }}
            onTouchStart={() => moveLane(1)}
            onClick={() => moveLane(1)}
           >→</button>
        </div>
      )}
    </div>
  )
}
