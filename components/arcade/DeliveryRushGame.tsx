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

  const CANVAS_WIDTH = 240
  const CANVAS_HEIGHT = 400
  const LANE_WIDTH = CANVAS_WIDTH / 3
  const PLAYER_WIDTH = 34
  const PLAYER_HEIGHT = 56
  const OBSTACLE_SIZE = 34
  const ITEM_SIZE = 26

  const playerLaneRef = useRef(1)
  const obstaclesRef = useRef<{ lane: number, y: number, type: 'car' | 'cone' }[]>([])
  const itemsRef = useRef<{ lane: number, y: number, type: 'burger' | 'pizza' }[]>([])
  const speedRef = useRef(4)
  const frameIdRef = useRef<number>(0)
  const isPlayingRef = useRef(false)
  const scoreRef = useRef(0)
  const highScoreRef = useRef(0)
  const roadOffsetRef = useRef(0)
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
  const accentColor = theme?.corPrimaria || '#eab308'
  const botColor = theme?.corBot || '#ffffff'
  const mutedColor = bgColor.startsWith('#f') || theme?.corFundoChat === '#ffffff' ? '#64748b' : '#94a3b8'
  const surfaceColor = bgColor.startsWith('#f') || theme?.corFundoChat === '#ffffff' ? '#ffffff' : '#1e293b'

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
    speedRef.current = 4
    scoreRef.current = 0
    roadOffsetRef.current = 0
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
    roadOffsetRef.current = (roadOffsetRef.current + speedRef.current) % 40

    if (Math.random() < 0.022) {
      const lane = Math.floor(Math.random() * 3)
      if (!obstaclesRef.current.some(o => o.lane === lane && o.y < 100)) {
        obstaclesRef.current.push({
          lane,
          y: -OBSTACLE_SIZE,
          type: Math.random() > 0.5 ? 'car' : 'cone'
        })
      }
    } else if (Math.random() < 0.03) {
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

    obstaclesRef.current.forEach(o => (o.y += speedRef.current))
    itemsRef.current.forEach(i => (i.y += speedRef.current))

    obstaclesRef.current = obstaclesRef.current.filter(o => o.y < CANVAS_HEIGHT)
    itemsRef.current = itemsRef.current.filter(i => i.y < CANVAS_HEIGHT)

    const playerX = playerLaneRef.current * LANE_WIDTH + (LANE_WIDTH - PLAYER_WIDTH) / 2
    const playerY = CANVAS_HEIGHT - PLAYER_HEIGHT - 16

    for (const o of obstaclesRef.current) {
      const obsX = o.lane * LANE_WIDTH + (LANE_WIDTH - OBSTACLE_SIZE) / 2
      if (
        playerX < obsX + OBSTACLE_SIZE &&
        playerX + PLAYER_WIDTH > obsX &&
        playerY < o.y + OBSTACLE_SIZE &&
        playerY + PLAYER_HEIGHT > o.y
      ) {
        endGame(); return
      }
    }

    itemsRef.current = itemsRef.current.filter(i => {
      const itemX = i.lane * LANE_WIDTH + (LANE_WIDTH - ITEM_SIZE) / 2
      const hit =
        playerX < itemX + ITEM_SIZE &&
        playerX + PLAYER_WIDTH > itemX &&
        playerY < i.y + ITEM_SIZE &&
        playerY + PLAYER_HEIGHT > i.y
      if (hit) {
        scoreRef.current += 50
        setScore(scoreRef.current)
        if (scoreRef.current > highScoreRef.current) {
          setHighScore(scoreRef.current)
          highScoreRef.current = scoreRef.current
          localStorage.setItem('delivery_highscore', scoreRef.current.toString())
        }
        speedRef.current = Math.min(10, speedRef.current + 0.08)
        return false
      }
      return true
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

    // Grama/estrada
    ctx.fillStyle = '#166534'
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
    ctx.fillStyle = '#374151'
    ctx.fillRect(8, 0, CANVAS_WIDTH - 16, CANVAS_HEIGHT)
    ctx.fillStyle = '#1f2937'
    ctx.fillRect(12, 0, CANVAS_WIDTH - 24, CANVAS_HEIGHT)

    // Faixas
    ctx.strokeStyle = '#fde68a'
    ctx.lineWidth = 3
    ctx.setLineDash([20, 20])
    for (let l = 1; l <= 2; l++) {
      const x = l * LANE_WIDTH
      ctx.lineDashOffset = -roadOffsetRef.current
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, CANVAS_HEIGHT)
      ctx.stroke()
    }
    ctx.setLineDash([])

    // Player (motoboy/veiculo entrega)
    const playerX = playerLaneRef.current * LANE_WIDTH + (LANE_WIDTH - PLAYER_WIDTH) / 2
    const playerY = CANVAS_HEIGHT - PLAYER_HEIGHT - 16

    ctx.fillStyle = accentColor
    ctx.shadowColor = accentColor
    ctx.shadowBlur = 10
    roundRect(ctx, playerX, playerY, PLAYER_WIDTH, PLAYER_HEIGHT, 8)
    ctx.fill()
    ctx.shadowBlur = 0

    // Farol
    ctx.fillStyle = '#fef9c3'
    roundRect(ctx, playerX + 6, playerY + 3, PLAYER_WIDTH - 12, 7, 3)
    ctx.fill()

    // Janela
    ctx.fillStyle = 'rgba(15,23,42,0.55)'
    roundRect(ctx, playerX + 5, playerY + 16, PLAYER_WIDTH - 10, 14, 3)
    ctx.fill()

    // Obstaculos
    obstaclesRef.current.forEach(o => {
      const obsX = o.lane * LANE_WIDTH + (LANE_WIDTH - OBSTACLE_SIZE) / 2
      if (o.type === 'car') {
        ctx.fillStyle = '#ef4444'
        ctx.shadowColor = '#ef4444'
        ctx.shadowBlur = 8
        roundRect(ctx, obsX, o.y, OBSTACLE_SIZE, OBSTACLE_SIZE, 6)
        ctx.fill()
        ctx.shadowBlur = 0
        ctx.fillStyle = '#111827'
        ctx.fillRect(obsX + 5, o.y + 6, OBSTACLE_SIZE - 10, 6)
      } else {
        ctx.fillStyle = '#f97316'
        ctx.shadowColor = '#f97316'
        ctx.shadowBlur = 6
        ctx.beginPath()
        ctx.moveTo(obsX + OBSTACLE_SIZE / 2, o.y + 2)
        ctx.lineTo(obsX + OBSTACLE_SIZE - 4, o.y + OBSTACLE_SIZE - 2)
        ctx.lineTo(obsX + 4, o.y + OBSTACLE_SIZE - 2)
        ctx.closePath()
        ctx.fill()
        ctx.shadowBlur = 0
        // faixas do cone
        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(obsX + 9, o.y + 14)
        ctx.lineTo(obsX + OBSTACLE_SIZE - 9, o.y + 14)
        ctx.stroke()
      }
    })

    // Itens (comidas)
    itemsRef.current.forEach(i => {
      const itemX = i.lane * LANE_WIDTH + (LANE_WIDTH - ITEM_SIZE) / 2
      const cor = i.type === 'burger' ? '#22c55e' : '#eab308'
      ctx.fillStyle = cor
      ctx.shadowColor = cor
      ctx.shadowBlur = 10
      ctx.beginPath()
      ctx.arc(itemX + ITEM_SIZE / 2, i.y + ITEM_SIZE / 2, ITEM_SIZE / 2, 0, Math.PI * 2)
      ctx.fill()
      ctx.shadowBlur = 0
      ctx.fillStyle = i.type === 'burger' ? '#fff' : '#b45309'
      ctx.font = 'bold 13px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(i.type === 'burger' ? '🍔' : '🍕', itemX + ITEM_SIZE / 2, i.y + ITEM_SIZE / 2 + 1)
    })
  }

  const roundRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.arcTo(x + w, y, x + w, y + h, r)
    ctx.arcTo(x + w, y + h, x, y + h, r)
    ctx.arcTo(x, y + h, x, y, r)
    ctx.arcTo(x, y, x + w, y, r)
    ctx.closePath()
  }

  const moveLane = (dir: -1 | 1) => {
    const newLane = playerLaneRef.current + dir
    if (newLane >= 0 && newLane <= 2) playerLaneRef.current = newLane
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) e.preventDefault()
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
            maxWidth: CANVAS_WIDTH,
            aspectRatio: `${CANVAS_WIDTH} / ${CANVAS_HEIGHT}`
          }}
        >
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className="w-full h-full block"
          />

          {(!isPlaying || gameOver) && (
            <div className="absolute inset-0 flex flex-col items-center justify-center backdrop-blur-sm bg-slate-950/70 p-6">
              <div className="text-center mb-5">
                <div className="text-5xl mb-2">🏍️</div>
                <h2
                  className="text-3xl font-extrabold tracking-tight"
                  style={{ color: accentColor, textShadow: `0 2px 20px ${accentColor}80` }}
                >
                  DELIVERY RUSH
                </h2>
                <p className="text-xs mt-1 font-medium" style={{ color: mutedColor }}>
                  Pegue os lanches e desvie dos carros!
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
                Use ← → para trocar de faixa
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Botões Delivery Rush: esquerda / direita */}
      <div className="mt-3 sm:mt-4 flex justify-center gap-6 shrink-0 w-full max-w-[320px]">
        <button
          aria-label="Faixa esquerda"
          {...tap(() => moveLane(-1))}
          className="w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-bold transition-all active:scale-90 shadow-md"
          style={{
            backgroundColor: surfaceColor,
            color: accentColor,
            border: `2px solid ${accentColor}33`,
            boxShadow: `0 8px 18px -10px ${accentColor}aa`
          }}
        >←</button>
        <button
          aria-label="Faixa direita"
          {...tap(() => moveLane(1))}
          className="w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-bold transition-all active:scale-90 shadow-md"
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
