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

  const GRID_SIZE = 18
  const TILE_COUNT = 18
  const BASE_SPEED = 170
  const MIN_SPEED = 90

  const snakeRef = useRef([{ x: 9, y: 9 }])
  const foodRef = useRef({ x: 14, y: 14 })
  const velocityRef = useRef({ x: 0, y: 0 })
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const highScoreRef = useRef(0)
  const isPlayingRef = useRef(false)
  const scoreRef = useRef(0)
  const speedRef = useRef(BASE_SPEED)
  const touchFiredRef = useRef(false)

  const tap = (fn: () => void) => ({
    onTouchStart: (e: React.TouchEvent) => {
      touchFiredRef.current = true
      e.preventDefault()
      fn()
    },
    onClick: () => {
      if (touchFiredRef.current) {
        touchFiredRef.current = false
        return
      }
      fn()
    }
  })

  const bgColor = theme?.corFundoChat || '#f8fafc'
  const textColor = theme?.corTexto || '#0f172a'
  const accentColor = theme?.corPrimaria || '#22c55e'
  const botColor = theme?.corBot || '#ffffff'
  const mutedColor = theme?.corFundoChat === '#ffffff' || bgColor === '#f8fafc' ? '#64748b' : '#94a3b8'
  const surfaceColor = theme?.corFundoChat === '#ffffff' || bgColor.startsWith('#f') ? '#ffffff' : '#1e293b'

  useEffect(() => {
    const saved = localStorage.getItem('snake_highscore')
    if (saved) {
      setHighScore(parseInt(saved))
      highScoreRef.current = parseInt(saved)
    }
  }, [])

  const atualizarVelocidade = () => {
    const pontos = scoreRef.current
    const reducao = Math.floor(pontos / 50) * 10
    speedRef.current = Math.max(MIN_SPEED, BASE_SPEED - reducao)
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = setInterval(gameLoop, speedRef.current)
    }
  }

  const startGame = () => {
    snakeRef.current = [{ x: 9, y: 9 }]
    foodRef.current = { x: 14, y: 14 }
    velocityRef.current = { x: 1, y: 0 }
    setScore(0); scoreRef.current = 0
    speedRef.current = BASE_SPEED
    setGameOver(false)
    setIsPlaying(true)
    isPlayingRef.current = true

    if (intervalRef.current) clearInterval(intervalRef.current)
    intervalRef.current = setInterval(gameLoop, speedRef.current)
    draw()
  }

  const gameLoop = () => {
    if (!isPlayingRef.current) return

    const snake = snakeRef.current
    const head = { ...snake[0] }
    const velocity = velocityRef.current

    head.x += velocity.x
    head.y += velocity.y

    if (head.x < 0 || head.x >= TILE_COUNT || head.y < 0 || head.y >= TILE_COUNT) {
      endGame(); return
    }

    for (let i = 0; i < snake.length; i++) {
      if (head.x === snake[i].x && head.y === snake[i].y) {
        endGame(); return
      }
    }

    snake.unshift(head)

    if (head.x === foodRef.current.x && head.y === foodRef.current.y) {
      setScore(s => {
        const novo = s + 10
        scoreRef.current = novo
        if (novo > highScoreRef.current) {
          setHighScore(novo); highScoreRef.current = novo
          localStorage.setItem('snake_highscore', novo.toString())
        }
        return novo
      })
      atualizarVelocidade()
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
    for (const part of snakeRef.current) {
      if (part.x === foodRef.current.x && part.y === foodRef.current.y) {
        placeFood(); return
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

    const W = canvas.width, H = canvas.height

    // fundo suave
    const grad = ctx.createLinearGradient(0, 0, W, H)
    grad.addColorStop(0, '#0b1220')
    grad.addColorStop(1, '#0f172a')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, W, H)

    // grid sutil
    ctx.strokeStyle = 'rgba(148,163,184,0.07)'
    ctx.lineWidth = 1
    for (let i = 1; i < TILE_COUNT; i++) {
      ctx.beginPath(); ctx.moveTo(i * GRID_SIZE, 0); ctx.lineTo(i * GRID_SIZE, H); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(0, i * GRID_SIZE); ctx.lineTo(W, i * GRID_SIZE); ctx.stroke()
    }

    // comida
    const fx = foodRef.current.x * GRID_SIZE + GRID_SIZE / 2
    const fy = foodRef.current.y * GRID_SIZE + GRID_SIZE / 2
    ctx.fillStyle = '#ef4444'
    ctx.shadowColor = '#ef4444'
    ctx.shadowBlur = 12
    ctx.beginPath()
    ctx.arc(fx, fy, GRID_SIZE / 2 - 3, 0, Math.PI * 2)
    ctx.fill()
    ctx.shadowBlur = 0

    // cobra
    snakeRef.current.forEach((part, index) => {
      const isHead = index === 0
      ctx.fillStyle = isHead ? accentColor : accentColor
      ctx.globalAlpha = isHead ? 1 : Math.max(0.5, 0.9 - index * 0.025)
      const x = part.x * GRID_SIZE + 2
      const y = part.y * GRID_SIZE + 2
      const r = 5
      const s = GRID_SIZE - 4
      ctx.beginPath()
      ctx.moveTo(x + r, y)
      ctx.arcTo(x + s, y, x + s, y + s, r)
      ctx.arcTo(x + s, y + s, x, y + s, r)
      ctx.arcTo(x, y + s, x, y, r)
      ctx.arcTo(x, y, x + s, y, r)
      ctx.closePath()
      if (isHead) {
        ctx.shadowColor = accentColor; ctx.shadowBlur = 14
      }
      ctx.fill()
      ctx.shadowBlur = 0
      ctx.globalAlpha = 1

      if (isHead) {
        // olhos
        ctx.fillStyle = '#0f172a'
        const ex1 = x + s * 0.30, ey1 = y + s * 0.30
        const ex2 = x + s * 0.70, ey2 = y + s * 0.30
        ctx.beginPath(); ctx.arc(ex1, ey1, 1.8, 0, Math.PI * 2); ctx.fill()
        ctx.beginPath(); ctx.arc(ex2, ey2, 1.8, 0, Math.PI * 2); ctx.fill()
      }
    })
  }

  const setDir = (dx: number, dy: number) => {
    if (!isPlayingRef.current) return
    if (dx !== 0 && velocityRef.current.x === -dx) return
    if (dy !== 0 && velocityRef.current.y === -dy) return
    velocityRef.current = { x: dx, y: dy }
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) e.preventDefault()
      if (!isPlayingRef.current) return
      switch (e.key) {
        case 'ArrowUp': setDir(0, -1); break
        case 'ArrowDown': setDir(0, 1); break
        case 'ArrowLeft': setDir(-1, 0); break
        case 'ArrowRight': setDir(1, 0); break
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  const touchStart = useRef<{ x: number, y: number } | null>(null)
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
  }
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart.current || !isPlayingRef.current) return
    const dx = e.changedTouches[0].clientX - touchStart.current.x
    const dy = e.changedTouches[0].clientY - touchStart.current.y
    if (Math.abs(dx) > Math.abs(dy)) setDir(dx > 0 ? 1 : -1, 0)
    else setDir(0, dy > 0 ? 1 : -1)
    touchStart.current = null
  }

  const canvasPx = GRID_SIZE * TILE_COUNT // 324

  return (
    <div
      className="flex flex-col items-center h-full min-h-0 w-full px-4 pt-4 pb-6 transition-colors duration-300"
      style={{ backgroundColor: bgColor, color: textColor }}
    >
      {/* Header */}
      <div className="w-full max-w-[360px] flex items-center justify-between mb-4 shrink-0">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium transition-all active:scale-95 shadow-sm border"
          style={{
            backgroundColor: surfaceColor,
            color: textColor,
            borderColor: theme?.corPrimaria ? `${accentColor}33` : 'rgba(148,163,184,0.25)'
          }}
        >
          <span className="text-lg leading-none">←</span>
          <span>Voltar</span>
        </button>

        <div className="flex items-center gap-2.5">
          <div
            className="px-3.5 py-1.5 rounded-2xl text-sm font-bold shadow-sm flex items-center gap-1.5"
            style={{
              backgroundColor: surfaceColor,
              boxShadow: `0 4px 14px -4px ${accentColor}40`,
              border: `1px solid ${accentColor}33`
            }}
          >
            <span style={{ color: accentColor }}>🏆</span>
            <span style={{ color: textColor }}>{score}</span>
          </div>
          <div
            className="px-3 py-1.5 rounded-2xl text-xs font-semibold"
            style={{ backgroundColor: surfaceColor, color: mutedColor, border: `1px solid ${mutedColor}22` }}
          >
            Max {highScore}
          </div>
        </div>
      </div>

      {/* Área do jogo */}
      <div className="my-3 sm:my-4 shrink-0 w-full flex items-center justify-center">
        <div
          className="relative rounded-2xl overflow-hidden shadow-lg"
          style={{
            border: `3px solid ${accentColor}`,
            boxShadow: `0 8px 30px -8px ${accentColor}55, 0 0 0 1px rgba(255,255,255,0.05) inset`,
            width: '100%',
            maxWidth: canvasPx,
            aspectRatio: '1 / 1'
          }}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <canvas
            ref={canvasRef}
            width={canvasPx}
            height={canvasPx}
            className="w-full h-full block"
          />

          {(!isPlaying || gameOver) && (
            <div className="absolute inset-0 flex flex-col items-center justify-center backdrop-blur-sm bg-slate-950/70 p-6">
              <div className="text-center mb-5">
                <div className="text-5xl mb-2">🐍</div>
                <h2
                  className="text-3xl font-extrabold tracking-tight"
                  style={{ color: accentColor, textShadow: `0 2px 20px ${accentColor}80` }}
                >
                  SNAKE
                </h2>
                <p className="text-xs mt-1 font-medium" style={{ color: mutedColor }}>
                  Capture as maçãs e não colida!
                </p>
              </div>

              {gameOver ? (
                <div className="flex flex-col items-center mb-5">
                  <div className="px-4 py-1.5 rounded-full bg-red-500/15 border border-red-500/30 text-red-400 text-sm font-bold mb-3">
                    GAME OVER
                  </div>
                  <div className="text-sm" style={{ color: mutedColor }}>
                    Pontuação: <span className="font-bold text-base" style={{ color: textColor }}>{score}</span>
                    {score === highScore && score > 0 && (
                      <span className="ml-2 text-amber-400 font-bold">🏆 NOVO RECORDE!</span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center mb-5">
                  <div className="text-xs mb-1" style={{ color: mutedColor }}>🏆 Melhor pontuação</div>
                  <div className="text-2xl font-bold" style={{ color: textColor }}>{highScore}</div>
                </div>
              )}

              <button
                onClick={startGame}
                className="text-white px-8 py-3 rounded-full text-sm font-extrabold transition-all transform active:scale-95 shadow-lg"
                style={{
                  background: `linear-gradient(135deg, ${accentColor}, ${accentColor}dd)`,
                  boxShadow: `0 10px 25px -8px ${accentColor}aa`
                }}
              >
                {gameOver ? '🔄 TENTAR NOVAMENTE' : '▶ JOGAR'}
              </button>

              <div className="mt-5 text-[11px] text-center font-medium" style={{ color: mutedColor }}>
                Controles: <span className="font-bold">setas</span>, <span className="font-bold">deslize</span> ou use os botões abaixo
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Botões de controle - SNAKE (4 direções) */}
      <div className="mt-3 sm:mt-4 grid grid-cols-3 gap-3 shrink-0 w-full max-w-[260px]">
        <div />
        <button
          aria-label="Cima"
          {...tap(() => setDir(0, -1))}
          className="aspect-square rounded-2xl flex items-center justify-center text-2xl font-bold transition-all active:scale-90 shadow-md"
          style={{
            backgroundColor: surfaceColor,
            color: accentColor,
            border: `2px solid ${accentColor}33`,
            boxShadow: `0 8px 18px -10px ${accentColor}aa`
          }}
        >↑</button>
        <div />

        <button
          aria-label="Esquerda"
          {...tap(() => setDir(-1, 0))}
          className="aspect-square rounded-2xl flex items-center justify-center text-2xl font-bold transition-all active:scale-90 shadow-md"
          style={{
            backgroundColor: surfaceColor,
            color: accentColor,
            border: `2px solid ${accentColor}33`,
            boxShadow: `0 8px 18px -10px ${accentColor}aa`
          }}
        >←</button>
        <button
          aria-label="Baixo"
          {...tap(() => setDir(0, 1))}
          className="aspect-square rounded-2xl flex items-center justify-center text-2xl font-bold transition-all active:scale-90 shadow-md"
          style={{
            backgroundColor: surfaceColor,
            color: accentColor,
            border: `2px solid ${accentColor}33`,
            boxShadow: `0 8px 18px -10px ${accentColor}aa`
          }}
        >↓</button>
        <button
          aria-label="Direita"
          {...tap(() => setDir(1, 0))}
          className="aspect-square rounded-2xl flex items-center justify-center text-2xl font-bold transition-all active:scale-90 shadow-md"
          style={{
            backgroundColor: surfaceColor,
            color: accentColor,
            border: `2px solid ${accentColor}33`,
            boxShadow: `0 8px 18px -10px ${accentColor}aa`
          }}
        >→</button>
      </div>
    </div>
  )
}
