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

export default function TetrisGame({ onBack, theme }: { onBack: () => void; theme?: Theme }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [score, setScore] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [highScore, setHighScore] = useState(0)

  const COLS = 10
  const ROWS = 20
  const BLOCK_SIZE = 18
  const CANVAS_W = COLS * BLOCK_SIZE
  const CANVAS_H = ROWS * BLOCK_SIZE

  const PIECES = [
    [[1, 1, 1, 1]],
    [[1, 0, 0], [1, 1, 1]],
    [[0, 0, 1], [1, 1, 1]],
    [[1, 1], [1, 1]],
    [[0, 1, 1], [1, 1, 0]],
    [[0, 1, 0], [1, 1, 1]],
    [[1, 1, 0], [0, 1, 1]],
  ]

  const COLORS = ['#22d3ee', '#3b82f6', '#f59e0b', '#eab308', '#22c55e', '#a855f7', '#ef4444']

  const gridRef = useRef<number[][]>(Array.from({ length: ROWS }, () => Array(COLS).fill(0)))
  const pieceRef = useRef<{ shape: number[][], color: string, x: number, y: number } | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const highScoreRef = useRef(0)
  const isPlayingRef = useRef(false)
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
  const accentColor = theme?.corPrimaria || '#3b82f6'
  const botColor = theme?.corBot || '#ffffff'
  const mutedColor = bgColor.startsWith('#f') || theme?.corFundoChat === '#ffffff' ? '#64748b' : '#94a3b8'
  const surfaceColor = bgColor.startsWith('#f') || theme?.corFundoChat === '#ffffff' ? '#ffffff' : '#1e293b'

  useEffect(() => {
    const saved = localStorage.getItem('tetris_highscore')
    if (saved) {
      setHighScore(parseInt(saved))
      highScoreRef.current = parseInt(saved)
    }
  }, [])

  const startGame = () => {
    gridRef.current = Array.from({ length: ROWS }, () => Array(COLS).fill(0))
    setScore(0)
    setGameOver(false)
    setIsPlaying(true)
    isPlayingRef.current = true
    spawnPiece()

    if (intervalRef.current) clearInterval(intervalRef.current)
    intervalRef.current = setInterval(gameLoop, 800)
    draw()
  }

  const spawnPiece = () => {
    const idx = Math.floor(Math.random() * PIECES.length)
    const shape = PIECES[idx]
    const color = COLORS[idx]

    pieceRef.current = {
      shape,
      color,
      x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2),
      y: 0
    }

    if (checkCollision(0, 0, shape)) {
      endGame()
    }
  }

  const checkCollision = (dx: number, dy: number, shape = pieceRef.current?.shape) => {
    if (!shape || !pieceRef.current) return false
    const { x, y } = pieceRef.current

    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (shape[r][c]) {
          const newX = x + c + dx
          const newY = y + r + dy

          if (newX < 0 || newX >= COLS || newY >= ROWS || (newY >= 0 && gridRef.current[newY][newX])) {
            return true
          }
        }
      }
    }
    return false
  }

  const rotate = () => {
    if (!pieceRef.current) return
    const shape = pieceRef.current.shape
    const newShape = shape[0].map((_, i) => shape.map(row => row[i]).reverse())

    if (!checkCollision(0, 0, newShape)) {
      pieceRef.current.shape = newShape
      draw()
    }
  }

  const move = (dx: number, dy: number) => {
    if (!pieceRef.current) return
    if (!checkCollision(dx, dy)) {
      pieceRef.current.x += dx
      pieceRef.current.y += dy
      draw()
      return true
    }
    return false
  }

  const drop = () => {
    if (!move(0, 1)) {
      lockPiece()
      clearLines()
      spawnPiece()
    }
  }

  const lockPiece = () => {
    if (!pieceRef.current) return
    const { shape, color, x, y } = pieceRef.current

    shape.forEach((row, r) => {
      row.forEach((cell, c) => {
        if (cell && y + r >= 0) {
          gridRef.current[y + r][x + c] = COLORS.indexOf(color) + 1
        }
      })
    })
  }

  const clearLines = () => {
    let linesCleared = 0
    for (let r = ROWS - 1; r >= 0; r--) {
      if (gridRef.current[r].every(cell => cell !== 0)) {
        gridRef.current.splice(r, 1)
        gridRef.current.unshift(Array(COLS).fill(0))
        linesCleared++
        r++
      }
    }

    if (linesCleared > 0) {
      setScore(s => {
        const points = [0, 100, 300, 500, 800][linesCleared] || 1000
        const newScore = s + points
        if (newScore > highScoreRef.current) {
          setHighScore(newScore)
          highScoreRef.current = newScore
          localStorage.setItem('tetris_highscore', newScore.toString())
        }
        return newScore
      })
    }
  }

  const endGame = () => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    setGameOver(true)
    setIsPlaying(false)
    isPlayingRef.current = false
  }

  const gameLoop = () => {
    if (!isPlayingRef.current) return
    drop()
    draw()
  }

  const draw = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_H)
    grad.addColorStop(0, '#0f172a')
    grad.addColorStop(1, '#111827')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)

    ctx.strokeStyle = 'rgba(148,163,184,0.08)'
    ctx.lineWidth = 1
    for (let i = 1; i < COLS; i++) {
      ctx.beginPath(); ctx.moveTo(i * BLOCK_SIZE, 0); ctx.lineTo(i * BLOCK_SIZE, CANVAS_H); ctx.stroke()
    }
    for (let i = 1; i < ROWS; i++) {
      ctx.beginPath(); ctx.moveTo(0, i * BLOCK_SIZE); ctx.lineTo(CANVAS_W, i * BLOCK_SIZE); ctx.stroke()
    }

    gridRef.current.forEach((row, r) => {
      row.forEach((cell, c) => {
        if (cell) drawBlock(ctx, c, r, COLORS[cell - 1])
      })
    })

    if (pieceRef.current) {
      const { shape, color, x, y } = pieceRef.current
      shape.forEach((row, r) => {
        row.forEach((cell, c) => {
          if (cell) drawBlock(ctx, x + c, y + r, color)
        })
      })
    }
  }

  const drawBlock = (ctx: CanvasRenderingContext2D, col: number, row: number, color: string) => {
    const x = col * BLOCK_SIZE + 1
    const y = row * BLOCK_SIZE + 1
    const s = BLOCK_SIZE - 2
    ctx.fillStyle = color
    ctx.shadowColor = color
    ctx.shadowBlur = 8
    ctx.beginPath()
    const r = 3
    ctx.moveTo(x + r, y)
    ctx.arcTo(x + s, y, x + s, y + s, r)
    ctx.arcTo(x + s, y + s, x, y + s, r)
    ctx.arcTo(x, y + s, x, y, r)
    ctx.arcTo(x, y, x + s, y, r)
    ctx.closePath()
    ctx.fill()
    ctx.shadowBlur = 0

    ctx.fillStyle = 'rgba(255,255,255,0.22)'
    ctx.fillRect(x + 2, y + 2, s - 4, 2)
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) e.preventDefault()
      if (!isPlayingRef.current) return
      if (e.key === 'ArrowLeft') move(-1, 0)
      if (e.key === 'ArrowRight') move(1, 0)
      if (e.key === 'ArrowDown') drop()
      if (e.key === 'ArrowUp') rotate()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  return (
    <div
      className="flex flex-col items-center h-full min-h-0 w-full px-4 pt-4 pb-6 transition-colors duration-300"
      style={{ backgroundColor: bgColor, color: textColor }}
    >
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

      <div className="my-3 sm:my-4 shrink-0 w-full flex items-center justify-center">
        <div
          className="relative rounded-2xl overflow-hidden shadow-lg"
          style={{
            border: `3px solid ${accentColor}`,
            boxShadow: `0 8px 30px -8px ${accentColor}55, 0 0 0 1px rgba(255,255,255,0.05) inset`,
            width: '100%',
            maxWidth: CANVAS_W,
            aspectRatio: `${COLS} / ${ROWS}`
          }}
        >
          <canvas
            ref={canvasRef}
            width={CANVAS_W}
            height={CANVAS_H}
            className="w-full h-full block"
          />

          {(!isPlaying || gameOver) && (
            <div className="absolute inset-0 flex flex-col items-center justify-center backdrop-blur-sm bg-slate-950/70 p-6">
              <div className="text-center mb-5">
                <div className="text-5xl mb-2">🧱</div>
                <h2
                  className="text-3xl font-extrabold tracking-tight"
                  style={{ color: accentColor, textShadow: `0 2px 20px ${accentColor}80` }}
                >
                  TETRIS
                </h2>
                <p className="text-xs mt-1 font-medium" style={{ color: mutedColor }}>
                  Complete linhas e marque pontos!
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
                ↑ girar · ↓ descer · ← → mover
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Botões Tetris: ↑(girar) + ← ↓(descer) → */}
      <div className="mt-3 sm:mt-4 grid grid-cols-3 gap-3 shrink-0 w-full max-w-[260px]">
        <div />
        <button
          aria-label="Girar"
          {...tap(() => rotate())}
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
          {...tap(() => move(-1, 0))}
          className="aspect-square rounded-2xl flex items-center justify-center text-2xl font-bold transition-all active:scale-90 shadow-md"
          style={{
            backgroundColor: surfaceColor,
            color: accentColor,
            border: `2px solid ${accentColor}33`,
            boxShadow: `0 8px 18px -10px ${accentColor}aa`
          }}
        >←</button>
        <button
          aria-label="Descer"
          {...tap(() => drop())}
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
          {...tap(() => move(1, 0))}
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
