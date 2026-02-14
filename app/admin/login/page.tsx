'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function onSubmit() {
    if (!email || !password) {
      setError('Informe email e senha')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include'
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setError(d.error || 'Credenciais inválidas')
        return
      }
      const d = await res.json().catch(() => ({}))
      if (d.role === 'SUPER_ADMIN') {
        window.location.href = '/super-admin'
        return
      }
      window.location.href = '/admin'
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#f3f4f6' }}>
      <div className="w-full max-w-[420px] rounded-2xl shadow-xl bg-white p-6">
        <div className="text-center mb-4">
          <div className="text-xl font-semibold">Acesso Administrativo</div>
          <div className="text-sm text-gray-500">Entre para gerenciar o sistema</div>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-sm text-gray-700">Email</label>
            <input
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') onSubmit()
              }}
              className="w-full border rounded-xl px-3 py-2 mt-1"
            />
          </div>
          <div>
            <label className="text-sm text-gray-700">Senha</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') onSubmit()
              }}
              className="w-full border rounded-xl px-3 py-2 mt-1"
            />
          </div>
          {error && <div className="text-sm text-red-600">{error}</div>}
          <button
            onClick={onSubmit}
            disabled={loading}
            className="w-full px-4 py-2 rounded-xl bg-black text-white disabled:opacity-50"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
          <div className="text-xs text-gray-500 mt-2">
            Dica: Super Admin — super@admin.local / super123 | Admin — admin@est.local / admin123
          </div>
        </div>
      </div>
    </main>
  )
}
