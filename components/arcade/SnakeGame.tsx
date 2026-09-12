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

export default function SnakeGame({ onBack, theme }: { onBack: () => void; theme?: Theme }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [score, setScore] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [highScore, setHighScore] = useState(0)

  // Configurações do jogo
  const GRID_SIZE = 20
  const TILE_COUNT = 20 // 400x400 canvas
  const SPEED = 100

  // Estado do jogo (usando refs para evitar re-renders no loop)
  const snakeRef = useRef([{ x: 10, y: 10 }])
  const foodRef = useRef({ x: 15, y: 15 })
  const velocityRef = useRef({ x: 0, y: 0 })
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const highScoreRef = useRef(0)
  const isPlayingRef = useRef(false) // Track playing state in ref for loop access

  // Theme colors
  const bgColor = theme?.corFundoChat || '#111827'
  const textColor = theme?.corTexto || '#ffffff'
  const accentColor = theme?.corPrimaria || '#2aff8a' // Default green for Snake
  const botColor = theme?.corBot || '#1f2937'

  useEffect(() => {
    const saved = localStorage.getItem('snake_highscore')
    if (saved) {
      setHighScore(parseInt(saved))
      highScoreRef.current = parseInt(saved)
    }
  }, [])

  const startGame = () => {
    snakeRef.current = [{ x: 10, y: 10 }]
    foodRef.current = { x: 15, y: 15 }
    velocityRef.current = { x: 1, y: 0 }
    setScore(0)
    setGameOver(false)
    setIsPlaying(true)
    isPlayingRef.current = true
    
    if (intervalRef.current) clearInterval(intervalRef.current)
    intervalRef.current = setInterval(gameLoop, SPEED)
  }

  const gameLoop = () => {
    if (!isPlayingRef.current) return

    const snake = snakeRef.current
    const head = { ...snake[0] }
    const velocity = velocityRef.current

    head.x += velocity.x
    head.y += velocity.y

    // Colisão com paredes
    if (head.x < 0 || head.x >= TILE_COUNT || head.y < 0 || head.y >= TILE_COUNT) {
      endGame()
      return
    }

    // Colisão com o próprio corpo
    for (let i = 0; i < snake.length; i++) {
      if (head.x === snake[i].x && head.y === snake[i].y) {
        endGame()
        return
      }
    }

    snake.unshift(head)

    // Comer maçã
    if (head.x === foodRef.current.x && head.y === foodRef.current.y) {
      setScore(s => {
        const newScore = s + 10
        if (newScore > highScoreRef.current) {
          setHighScore(newScore)
          highScoreRef.current = newScore
          localStorage.setItem('snake_highscore', newScore.toString())
        }
        return newScore
      })
      placeFood()
    } else {
      snake.pop()
    }

    draw()
  }

  const placeFood = () => {
    foodRef.current = {
      x: Math.floor(Math.random() * TILE_COUNT),
      y: Math.floor(Math.random() * TILE_COUNT)
    }
    // Evitar nascer em cima da cobra
    for (let part of snakeRef.current) {
      if (part.x === foodRef.current.x && part.y === foodRef.current.y) {
        placeFood()
        return
      }
    }
  }

  const endGame = () => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    setGameOver(true)
    setIsPlaying(false)
    isPlayingRef.current = false
  }

  const draw = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Limpar tela
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Desenhar cobra
    snakeRef.current.forEach((part, index) => {
      // Cabeça de cor diferente
      if (index === 0) ctx.fillStyle = accentColor
      else ctx.fillStyle = accentColor // Use theme color but maybe darker?
      
      ctx.globalAlpha = index === 0 ? 1 : 0.8
      ctx.fillRect(part.x * GRID_SIZE, part.y * GRID_SIZE, GRID_SIZE - 2, GRID_SIZE - 2)
      ctx.globalAlpha = 1
    })

    // Desenhar comida
    ctx.fillStyle = '#f00'
    ctx.fillRect(foodRef.current.x * GRID_SIZE, foodRef.current.y * GRID_SIZE, GRID_SIZE - 2, GRID_SIZE - 2)
  }

  // Controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault()
      }
      
      if (!isPlayingRef.current) return
      
      switch (e.key) {
        case 'ArrowUp':
          if (velocityRef.current.y !== 1) velocityRef.current = { x: 0, y: -1 }
          break
        case 'ArrowDown':
          if (velocityRef.current.y !== -1) velocityRef.current = { x: 0, y: 1 }
          break
        case 'ArrowLeft':
          if (velocityRef.current.x !== 1) velocityRef.current = { x: -1, y: 0 }
          break
        case 'ArrowRight':
          if (velocityRef.current.x !== -1) velocityRef.current = { x: 1, y: 0 }
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  // Swipe controls
  const touchStart = useRef<{ x: number, y: number } | null>(null)

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStart.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY
    }
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart.current || !isPlaying) return

    const touchEnd = {
      x: e.changedTouches[0].clientX,
      y: e.changedTouches[0].clientY
    }

    const dx = touchEnd.x - touchStart.current.x
    const dy = touchEnd.y - touchStart.current.y

    if (Math.abs(dx) > Math.abs(dy)) {
      // Horizontal
      if (dx > 0 && velocityRef.current.x !== -1) velocityRef.current = { x: 1, y: 0 }
      else if (dx < 0 && velocityRef.current.x !== 1) velocityRef.current = { x: -1, y: 0 }
    } else {
      // Vertical
      if (dy > 0 && velocityRef.current.y !== -1) velocityRef.current = { x: 0, y: 1 }
      else if (dy < 0 && velocityRef.current.y !== 1) velocityRef.current = { x: 0, y: -1 }
    }
  }

  return (
    <div 
      className="flex flex-col items-center h-full min-h-0 p-4 transition-colors duration-300"
      style={{ backgroundColor: bgColor, color: textColor }}
    >
      <div className="flex justify-between w-full max-w-[400px] mb-4">
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
          className="relative border-4 rounded-lg overflow-hidden shadow-[0_0_20px_rgba(0,255,0,0.5)]"
          style={{ borderColor: accentColor, boxShadow: `0 0 20px ${accentColor}80` }}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <canvas
            ref={canvasRef}
            width={400}
            height={400}
            className="bg-black block max-w-full"
            style={{ height: 'min(400px, 50vh)', width: 'auto', maxWidth: '100%' }}
          />
          
          {(!isPlaying || gameOver) && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80">
              <h2 
                className="text-4xl font-bold mb-4 font-mono"
                style={{ color: accentColor }}
              >
                SNAKE
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
              <div className="mt-4 text-sm text-gray-500">
                Use as setas ou deslize para controlar
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
