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

  // Configurações do jogo
  const COLS = 10
  const ROWS = 20
  const BLOCK_SIZE = 20 // 200x400 canvas

  // Peças do Tetris (I, J, L, O, S, T, Z)
  const PIECES = [
    [[1, 1, 1, 1]], // I
    [[1, 0, 0], [1, 1, 1]], // J
    [[0, 0, 1], [1, 1, 1]], // L
    [[1, 1], [1, 1]], // O
    [[0, 1, 1], [1, 1, 0]], // S
    [[0, 1, 0], [1, 1, 1]], // T
    [[1, 1, 0], [0, 1, 1]], // Z
  ]

  const COLORS = [
    '#00f0f0', // Cyan
    '#0000f0', // Blue
    '#f0a000', // Orange
    '#f0f000', // Yellow
    '#00f000', // Green
    '#a000f0', // Purple
    '#f00000', // Red
  ]

  // Estado do jogo
  const gridRef = useRef<number[][]>(Array.from({ length: ROWS }, () => Array(COLS).fill(0)))
  const pieceRef = useRef<{ shape: number[][], color: string, x: number, y: number } | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const highScoreRef = useRef(0)
  const isPlayingRef = useRef(false)

  // Theme colors
  const bgColor = theme?.corFundoChat || '#111827'
  const textColor = theme?.corTexto || '#ffffff'
  const accentColor = theme?.corPrimaria || '#3aa0ff' // Default blue for Tetris
  const botColor = theme?.corBot || '#1f2937'

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

    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Grid
    gridRef.current.forEach((row, r) => {
      row.forEach((cell, c) => {
        if (cell) {
          ctx.fillStyle = COLORS[cell - 1]
          ctx.fillRect(c * BLOCK_SIZE, r * BLOCK_SIZE, BLOCK_SIZE - 1, BLOCK_SIZE - 1)
        }
      })
    })

    // Current Piece
    if (pieceRef.current) {
      ctx.fillStyle = pieceRef.current.color
      pieceRef.current.shape.forEach((row, r) => {
        row.forEach((cell, c) => {
          if (cell) {
            ctx.fillRect((pieceRef.current!.x + c) * BLOCK_SIZE, (pieceRef.current!.y + r) * BLOCK_SIZE, BLOCK_SIZE - 1, BLOCK_SIZE - 1)
          }
        })
      })
    }
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault()
      }
      
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
          className="relative border-4 rounded-lg overflow-hidden shadow-[0_0_20px_rgba(0,0,255,0.5)]"
          style={{ borderColor: accentColor, boxShadow: `0 0 20px ${accentColor}80` }}
        >
          <canvas
            ref={canvasRef}
            width={200}
            height={400}
            className="bg-black block max-w-full"
            style={{ height: 'min(400px, 42vh)', width: 'auto', maxWidth: '100%' }}
          />
          
          {(!isPlaying || gameOver) && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80">
              <h2 
                className="text-3xl font-bold mb-4 font-mono"
                style={{ color: accentColor }}
              >
                TETRIS
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
        <div className="mt-4 sm:mt-8 grid grid-cols-3 gap-3 sm:gap-4 shrink-0">
          <div />
          <button 
            onClick={() => rotate()} 
            className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-xl active:opacity-80"
            style={{ backgroundColor: botColor, color: textColor }}
          >↑</button>
          <div />
          <button 
            onClick={() => move(-1, 0)} 
            className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-xl active:opacity-80"
            style={{ backgroundColor: botColor, color: textColor }}
          >←</button>
          <button 
            onClick={() => drop()} 
            className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-xl active:opacity-80"
            style={{ backgroundColor: botColor, color: textColor }}
          >↓</button>
          <button 
            onClick={() => move(1, 0)} 
            className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-xl active:opacity-80"
            style={{ backgroundColor: botColor, color: textColor }}
          >→</button>
        </div>
      )}
    </div>
  )
}
