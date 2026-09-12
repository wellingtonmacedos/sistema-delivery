'use client'

import { useState } from 'react'
import SnakeGame from './SnakeGame'
import TetrisGame from './TetrisGame'
import SpaceShooterGame from './SpaceShooterGame'
import DeliveryRushGame from './DeliveryRushGame'

const GAMES = [
  {
    id: 'snake',
    title: 'Snake',
    icon: '🐍',
    borderColor: '#2aff8a',
    shadowColor: 'rgba(42,255,138,0.4)',
    component: SnakeGame
  },
  {
    id: 'tetris',
    title: 'Tetris',
    icon: '🧱',
    borderColor: '#3aa0ff',
    shadowColor: 'rgba(58,160,255,0.4)',
    component: TetrisGame
  },
  {
    id: 'shooter',
    title: 'Space Shooter',
    icon: '🚀',
    borderColor: '#b76cff',
    shadowColor: 'rgba(183,108,255,0.4)',
    component: SpaceShooterGame
  },
  {
    id: 'delivery',
    title: 'Delivery Rush',
    icon: '🛵',
    borderColor: '#ffd23a',
    shadowColor: 'rgba(255,210,58,0.4)',
    component: DeliveryRushGame
  }
]

type Theme = {
  corPrimaria: string
  corBot: string
  corTexto: string
  corFundoChat: string
  logoUrl?: string | null
  nome?: string
}

export default function ArcadeMenu({ onBack, theme }: { onBack: () => void; theme?: Theme }) {
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null)

  const selectedGame = GAMES.find(g => g.id === selectedGameId)

  if (selectedGame) {
    const GameComponent = selectedGame.component
    return <GameComponent onBack={() => setSelectedGameId(null)} theme={theme} />
  }

  // Fallback colors if theme is not provided (though it should be)
  const bgColor = theme?.corFundoChat || '#111827' // default to dark if no theme? or light? user asked for chat colors.
  const textColor = theme?.corTexto || '#ffffff'
  const cardBg = theme?.corBot || '#1f2937'
  const accentColor = theme?.corPrimaria || '#ec4899'

  return (
    <div 
      className="h-full font-mono flex flex-col overflow-hidden transition-colors duration-300"
      style={{ backgroundColor: bgColor, color: textColor }}
    >
      <div 
        className="px-4 py-3 border-b flex items-center justify-between shrink-0"
        style={{ borderColor: accentColor + '40' }}
      >
        <div className="flex items-center gap-2">
          <span className="text-xl">🕹️</span>
          <h1 
            className="text-sm font-bold tracking-wider animate-pulse"
            style={{ color: accentColor }}
          >
            MINI ARCADE
          </h1>
        </div>
        <button 
          onClick={onBack}
          className="text-xs font-bold px-3 py-1.5 rounded-full transition-all hover:opacity-80 active:scale-95 border"
          style={{ 
            borderColor: accentColor,
            color: accentColor,
            backgroundColor: accentColor + '10'
          }}
        >
          FECHAR
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="w-full mx-auto flex flex-col h-full">
          <div className="grid grid-cols-2 gap-3 pb-4">
            {GAMES.map(game => (
              <button
                key={game.id}
                onClick={() => setSelectedGameId(game.id)}
                className="group relative overflow-hidden rounded-xl border-2 p-3 flex flex-col items-center justify-center text-center transition-all hover:scale-105 h-[100px]"
                style={{ 
                  borderColor: game.borderColor,
                  backgroundColor: game.borderColor + '10',
                  boxShadow: `0 0 10px ${game.shadowColor}`
                }}
              >
                <div className="text-2xl mb-1 transform group-hover:scale-125 transition-transform duration-300">
                  {game.icon}
                </div>
                <div 
                  className="font-bold text-[10px] uppercase tracking-wider"
                  style={{ color: game.borderColor }}
                >
                  {game.title}
                </div>
                
                <div 
                  className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-300"
                  style={{ backgroundColor: game.borderColor }}
                />
              </button>
            ))}
          </div>
          
          <div className="mt-auto pt-4 text-center opacity-50 text-[10px]">
            <p>Use as setas ou deslize para jogar</p>
            <p className="mt-1">High scores salvos localmente</p>
          </div>
        </div>
      </div>
    </div>
  )
}
