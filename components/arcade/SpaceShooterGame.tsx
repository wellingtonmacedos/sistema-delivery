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

export default function SpaceShooterGame({ onBack, theme }: { onBack: () => void; theme?: Theme }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [score, setScore] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [highScore, setHighScore] = useState(0)

  // Configurações
  const CANVAS_WIDTH = 300
  const CANVAS_HEIGHT = 500
  const PLAYER_SIZE = 30
  const BULLET_SIZE = 5
  const ENEMY_SIZE = 25

  // Estado
  const playerRef = useRef({ x: CANVAS_WIDTH / 2 - PLAYER_SIZE / 2, y: CANVAS_HEIGHT - 50 })
  const bulletsRef = useRef<{ x: number, y: number }[]>([])
  const enemiesRef = useRef<{ x: number, y: number }[]>([])
  const frameIdRef = useRef<number>(0)
  const lastShotTimeRef = useRef(0)
  const isPlayingRef = useRef(false)
  const highScoreRef = useRef(0)

  // Theme colors
  const bgColor = theme?.corFundoChat || '#111827'
  const textColor = theme?.corTexto || '#ffffff'
  const accentColor = theme?.corPrimaria || '#ec4899'
  const botColor = theme?.corBot || '#1f2937'

  useEffect(() => {
    const saved = localStorage.getItem('shooter_highscore')
    if (saved) {
      setHighScore(parseInt(saved))
      highScoreRef.current = parseInt(saved)
    }
  }, [])

  const startGame = () => {
    playerRef.current = { x: CANVAS_WIDTH / 2 - PLAYER_SIZE / 2, y: CANVAS_HEIGHT - 50 }
    bulletsRef.current = []
    enemiesRef.current = []
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
    if (!isPlayingRef.current) return

    // Spawn enemies
    if (Math.random() < 0.02) {
      enemiesRef.current.push({
        x: Math.random() * (CANVAS_WIDTH - ENEMY_SIZE),
        y: -ENEMY_SIZE
      })
    }

    // Update bullets
    bulletsRef.current = bulletsRef.current
      .map(b => ({ ...b, y: b.y - 5 }))
      .filter(b => b.y > 0)

    // Update enemies
    enemiesRef.current = enemiesRef.current
      .map(e => ({ ...e, y: e.y + 2 }))
      .filter(e => e.y < CANVAS_HEIGHT)

    // Collision Bullet-Enemy
    bulletsRef.current.forEach((b, bIdx) => {
      enemiesRef.current.forEach((e, eIdx) => {
        if (
          b.x < e.x + ENEMY_SIZE &&
          b.x + BULLET_SIZE > e.x &&
          b.y < e.y + ENEMY_SIZE &&
          b.y + BULLET_SIZE > e.y
        ) {
          // Hit
          bulletsRef.current.splice(bIdx, 1)
          enemiesRef.current.splice(eIdx, 1)
          setScore(s => {
            const newScore = s + 100
            if (newScore > highScoreRef.current) {
              setHighScore(newScore)
              highScoreRef.current = newScore
              localStorage.setItem('shooter_highscore', newScore.toString())
            }
            return newScore
          })
        }
      })
    })

    // Collision Player-Enemy
    const p = playerRef.current
    enemiesRef.current.forEach(e => {
      if (
        p.x < e.x + ENEMY_SIZE &&
        p.x + PLAYER_SIZE > e.x &&
        p.y < e.y + ENEMY_SIZE &&
        p.y + PLAYER_SIZE > e.y
      ) {
        endGame()
      }
    })
  }

  const endGame = () => {
    cancelAnimationFrame(frameIdRef.current)
    setGameOver(true)
    setIsPlaying(false)
    isPlayingRef.current = false
  }

  const draw = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

    // Stars background effect
    ctx.fillStyle = '#fff'
    for(let i=0; i<10; i++) {
        ctx.fillRect(Math.random() * CANVAS_WIDTH, Math.random() * CANVAS_HEIGHT, 1, 1)
    }

    // Player
    ctx.fillStyle = accentColor // Use theme color for player
    ctx.beginPath()
    ctx.moveTo(playerRef.current.x + PLAYER_SIZE / 2, playerRef.current.y)
    ctx.lineTo(playerRef.current.x + PLAYER_SIZE, playerRef.current.y + PLAYER_SIZE)
    ctx.lineTo(playerRef.current.x, playerRef.current.y + PLAYER_SIZE)
    ctx.fill()

    // Bullets
    ctx.fillStyle = '#ffff00'
    bulletsRef.current.forEach(b => {
      ctx.fillRect(b.x, b.y, BULLET_SIZE, BULLET_SIZE * 2)
    })

    // Enemies
    ctx.fillStyle = '#ff0000'
    enemiesRef.current.forEach(e => {
      ctx.fillRect(e.x, e.y, ENEMY_SIZE, ENEMY_SIZE)
      // Eyes
      ctx.fillStyle = '#000'
      ctx.fillRect(e.x + 5, e.y + 10, 5, 5)
      ctx.fillRect(e.x + 15, e.y + 10, 5, 5)
      ctx.fillStyle = '#ff0000'
    })
  }

  const movePlayer = (dx: number) => {
    playerRef.current.x = Math.max(0, Math.min(CANVAS_WIDTH - PLAYER_SIZE, playerRef.current.x + dx))
  }

  const shoot = () => {
    const now = Date.now()
    if (now - lastShotTimeRef.current > 300) {
      bulletsRef.current.push({
        x: playerRef.current.x + PLAYER_SIZE / 2 - BULLET_SIZE / 2,
        y: playerRef.current.y
      })
      lastShotTimeRef.current = now
    }
  }

  // Controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault()
      }

      if (!isPlayingRef.current) return
      if (e.key === 'ArrowLeft') movePlayer(-10)
      if (e.key === 'ArrowRight') movePlayer(10)
      if (e.key === ' ') shoot()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      cancelAnimationFrame(frameIdRef.current)
    }
  }, []) // Remove isPlaying dependency to avoid re-binding

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
          className="relative border-4 rounded-lg overflow-hidden shadow-[0_0_20px_rgba(255,0,255,0.5)]"
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
                className="text-3xl font-bold mb-4 font-mono"
                style={{ color: accentColor }}
              >
                SPACE SHOOTER
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
        <div className="mt-4 flex gap-6 shrink-0">
           <button 
            className="w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center text-2xl active:opacity-80"
            style={{ backgroundColor: botColor, color: textColor }}
            onTouchStart={() => movePlayer(-20)}
            onClick={() => movePlayer(-20)}
           >←</button>
           <button 
            className="w-16 h-16 sm:w-20 sm:h-20 bg-red-600 rounded-full flex items-center justify-center text-xl font-bold active:bg-red-500 shadow-lg border-4 border-red-800"
            onTouchStart={shoot}
            onClick={shoot}
           >TIRO</button>
           <button 
            className="w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center text-2xl active:opacity-80"
            style={{ backgroundColor: botColor, color: textColor }}
            onTouchStart={() => movePlayer(20)}
            onClick={() => movePlayer(20)}
           >
            →
           </button>
        </div>
      )}
    </div>
  )
}
