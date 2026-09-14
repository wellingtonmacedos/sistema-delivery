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

  const CANVAS_WIDTH = 240
  const CANVAS_HEIGHT = 400
  const PLAYER_SIZE = 26
  const BULLET_SIZE = 4
  const ENEMY_SIZE = 22

  const playerRef = useRef({ x: CANVAS_WIDTH / 2 - PLAYER_SIZE / 2, y: CANVAS_HEIGHT - 44 })
  const bulletsRef = useRef<{ x: number, y: number }[]>([])
  const enemiesRef = useRef<{ x: number, y: number }[]>([])
  const starsRef = useRef<{ x: number, y: number, s: number }[]>(
    Array.from({ length: 40 }, () => ({
      x: Math.random() * CANVAS_WIDTH,
      y: Math.random() * CANVAS_HEIGHT,
      s: Math.random() * 1.2 + 0.4
    }))
  )
  const frameIdRef = useRef<number>(0)
  const lastShotTimeRef = useRef(0)
  const isPlayingRef = useRef(false)
  const highScoreRef = useRef(0)
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
  const accentColor = theme?.corPrimaria || '#ec4899'
  const botColor = theme?.corBot || '#ffffff'
  const mutedColor = bgColor.startsWith('#f') || theme?.corFundoChat === '#ffffff' ? '#64748b' : '#94a3b8'
  const surfaceColor = bgColor.startsWith('#f') || theme?.corFundoChat === '#ffffff' ? '#ffffff' : '#1e293b'

  useEffect(() => {
    const saved = localStorage.getItem('shooter_highscore')
    if (saved) {
      setHighScore(parseInt(saved))
      highScoreRef.current = parseInt(saved)
    }
  }, [])

  const startGame = () => {
    playerRef.current = { x: CANVAS_WIDTH / 2 - PLAYER_SIZE / 2, y: CANVAS_HEIGHT - 44 }
    bulletsRef.current = []
    enemiesRef.current = []
    setScore(0)
    setGameOver(false)
    setIsPlaying(true)
    isPlayingRef.current = true
    lastShotTimeRef.current = 0

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

    // estrelas
    starsRef.current.forEach(st => { st.y += st.s; if (st.y > CANVAS_HEIGHT) { st.y = 0; st.x = Math.random() * CANVAS_WIDTH } })

    if (Math.random() < 0.02) {
      enemiesRef.current.push({
        x: Math.random() * (CANVAS_WIDTH - ENEMY_SIZE),
        y: -ENEMY_SIZE
      })
    }

    bulletsRef.current = bulletsRef.current
      .map(b => ({ ...b, y: b.y - 4.5 }))
      .filter(b => b.y > -10)

    enemiesRef.current = enemiesRef.current
      .map(e => ({ ...e, y: e.y + 1.8 }))
      .filter(e => e.y < CANVAS_HEIGHT + 10)

    const bulletsToRemove = new Set<number>()
    const enemiesToRemove = new Set<number>()

    bulletsRef.current.forEach((b, bIdx) => {
      enemiesRef.current.forEach((e, eIdx) => {
        if (
          !bulletsToRemove.has(bIdx) && !enemiesToRemove.has(eIdx) &&
          b.x < e.x + ENEMY_SIZE &&
          b.x + BULLET_SIZE > e.x &&
          b.y < e.y + ENEMY_SIZE &&
          b.y + BULLET_SIZE * 2 > e.y
        ) {
          bulletsToRemove.add(bIdx)
          enemiesToRemove.add(eIdx)
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

    bulletsRef.current = bulletsRef.current.filter((_, i) => !bulletsToRemove.has(i))
    enemiesRef.current = enemiesRef.current.filter((_, i) => !enemiesToRemove.has(i))

    const p = playerRef.current
    for (const e of enemiesRef.current) {
      if (
        p.x < e.x + ENEMY_SIZE &&
        p.x + PLAYER_SIZE > e.x &&
        p.y < e.y + ENEMY_SIZE &&
        p.y + PLAYER_SIZE > e.y
      ) {
        endGame(); return
      }
    }
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

    const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT)
    grad.addColorStop(0, '#020617')
    grad.addColorStop(1, '#1e1b4b')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

    // estrelas
    for (const st of starsRef.current) {
      ctx.fillStyle = `rgba(255,255,255,${0.3 + st.s * 0.4})`
      ctx.fillRect(st.x, st.y, st.s, st.s)
    }

    // Player (nave)
    const p = playerRef.current
    ctx.fillStyle = accentColor
    ctx.shadowColor = accentColor
    ctx.shadowBlur = 12
    ctx.beginPath()
    ctx.moveTo(p.x + PLAYER_SIZE / 2, p.y)
    ctx.lineTo(p.x + PLAYER_SIZE, p.y + PLAYER_SIZE)
    ctx.lineTo(p.x + PLAYER_SIZE * 0.72, p.y + PLAYER_SIZE * 0.78)
    ctx.lineTo(p.x + PLAYER_SIZE * 0.5, p.y + PLAYER_SIZE * 0.92)
    ctx.lineTo(p.x + PLAYER_SIZE * 0.28, p.y + PLAYER_SIZE * 0.78)
    ctx.lineTo(p.x, p.y + PLAYER_SIZE)
    ctx.closePath()
    ctx.fill()
    ctx.shadowBlur = 0

    // cockpit
    ctx.fillStyle = '#0ea5e9'
    ctx.shadowColor = '#0ea5e9'
    ctx.shadowBlur = 4
    ctx.beginPath()
    ctx.arc(p.x + PLAYER_SIZE / 2, p.y + PLAYER_SIZE * 0.55, PLAYER_SIZE * 0.18, 0, Math.PI * 2)
    ctx.fill()
    ctx.shadowBlur = 0

    // chama propulsão
    const chamaH = 6 + Math.random() * 4
    const chamaG = ctx.createLinearGradient(0, p.y + PLAYER_SIZE - 2, 0, p.y + PLAYER_SIZE + chamaH)
    chamaG.addColorStop(0, '#f97316')
    chamaG.addColorStop(1, 'rgba(249,115,22,0)')
    ctx.fillStyle = chamaG
    ctx.beginPath()
    ctx.moveTo(p.x + PLAYER_SIZE * 0.38, p.y + PLAYER_SIZE - 2)
    ctx.lineTo(p.x + PLAYER_SIZE / 2, p.y + PLAYER_SIZE + chamaH)
    ctx.lineTo(p.x + PLAYER_SIZE * 0.62, p.y + PLAYER_SIZE - 2)
    ctx.closePath()
    ctx.fill()

    // Balas
    ctx.fillStyle = '#fde047'
    ctx.shadowColor = '#fde047'
    ctx.shadowBlur = 6
    bulletsRef.current.forEach(b => {
      ctx.fillRect(b.x, b.y, BULLET_SIZE, BULLET_SIZE * 2.4)
    })
    ctx.shadowBlur = 0

    // Inimigos
    enemiesRef.current.forEach(e => {
      ctx.fillStyle = '#ef4444'
      ctx.shadowColor = '#ef4444'
      ctx.shadowBlur = 8
      ctx.beginPath()
      ctx.moveTo(e.x + ENEMY_SIZE / 2, e.y + ENEMY_SIZE)
      ctx.lineTo(e.x + ENEMY_SIZE, e.y + 6)
      ctx.lineTo(e.x + ENEMY_SIZE * 0.7, e.y)
      ctx.lineTo(e.x + ENEMY_SIZE * 0.3, e.y)
      ctx.lineTo(e.x, e.y + 6)
      ctx.closePath()
      ctx.fill()
      ctx.shadowBlur = 0
      // olhos
      ctx.fillStyle = '#fef2f2'
      ctx.beginPath()
      ctx.arc(e.x + ENEMY_SIZE * 0.36, e.y + ENEMY_SIZE * 0.52, 2.6, 0, Math.PI * 2); ctx.fill()
      ctx.beginPath()
      ctx.arc(e.x + ENEMY_SIZE * 0.64, e.y + ENEMY_SIZE * 0.52, 2.6, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = '#450a0a'
      ctx.beginPath()
      ctx.arc(e.x + ENEMY_SIZE * 0.36, e.y + ENEMY_SIZE * 0.52, 1.1, 0, Math.PI * 2); ctx.fill()
      ctx.beginPath()
      ctx.arc(e.x + ENEMY_SIZE * 0.64, e.y + ENEMY_SIZE * 0.52, 1.1, 0, Math.PI * 2); ctx.fill()
    })
  }

  const movePlayer = (dx: number) => {
    playerRef.current.x = Math.max(0, Math.min(CANVAS_WIDTH - PLAYER_SIZE, playerRef.current.x + dx))
  }

  const shoot = () => {
    const now = Date.now()
    if (now - lastShotTimeRef.current > 280) {
      bulletsRef.current.push({
        x: playerRef.current.x + PLAYER_SIZE / 2 - BULLET_SIZE / 2,
        y: playerRef.current.y - 2
      })
      lastShotTimeRef.current = now
    }
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault()
      if (!isPlayingRef.current) return
      if (e.key === 'ArrowLeft') movePlayer(-14)
      if (e.key === 'ArrowRight') movePlayer(14)
      if (e.key === ' ') shoot()
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
                <div className="text-5xl mb-2">🚀</div>
                <h2
                  className="text-3xl font-extrabold tracking-tight"
                  style={{ color: accentColor, textShadow: `0 2px 20px ${accentColor}80` }}
                >
                  SPACE SHOOTER
                </h2>
                <p className="text-xs mt-1 font-medium" style={{ color: mutedColor }}>
                  Ataque as naves inimigas!
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
                ← → mover · TIRO para atirar
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Botões Space Shooter: ← / TIRO / → */}
      <div className="mt-3 sm:mt-4 flex items-center justify-center gap-4 shrink-0 w-full max-w-[360px]">
        <button
          aria-label="Mover esquerda"
          {...tap(() => movePlayer(-16))}
          className="w-[72px] h-[72px] rounded-2xl flex items-center justify-center text-3xl font-bold transition-all active:scale-90 shadow-md"
          style={{
            backgroundColor: surfaceColor,
            color: accentColor,
            border: `2px solid ${accentColor}33`,
            boxShadow: `0 8px 18px -10px ${accentColor}aa`
          }}
        >←</button>

        <button
          aria-label="Atirar"
          {...tap(() => shoot())}
          className="w-[88px] h-[88px] rounded-full flex items-center justify-center text-sm font-black text-white transition-all active:scale-90 shadow-lg border-4"
          style={{
            background: 'linear-gradient(145deg, #ef4444, #dc2626)',
            borderColor: '#991b1b',
            boxShadow: '0 10px 22px -6px rgba(239,68,68,0.6), inset 0 2px 0 rgba(255,255,255,0.25)'
          }}
        >TIRO</button>

        <button
          aria-label="Mover direita"
          {...tap(() => movePlayer(16))}
          className="w-[72px] h-[72px] rounded-2xl flex items-center justify-center text-3xl font-bold transition-all active:scale-90 shadow-md"
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
