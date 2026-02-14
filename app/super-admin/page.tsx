'use client'
import { useEffect, useState } from 'react'

type Estabelecimento = {
  id: string
  nome: string
  slug: string
  perfil: 'LANCHONETE' | 'ACAITERIA' | 'PIZZARIA'
  ativo: boolean
  createdAt: string
}

const perfis = ['LANCHONETE', 'ACAITERIA', 'PIZZARIA'] as const

export default function SuperAdminDashboard() {
  const [list, setList] = useState<Estabelecimento[]>([])
  const [form, setForm] = useState<{ nome: string; slug: string; perfil: Estabelecimento['perfil']; ativo: boolean }>({
    nome: '',
    slug: '',
    perfil: 'LANCHONETE',
    ativo: true
  })
  const [editing, setEditing] = useState<Estabelecimento | null>(null)
  const [admins, setAdmins] = useState<any[]>([])
  const [adminForm, setAdminForm] = useState<{ email: string; password: string; estabelecimentoId: string; role: 'ADMIN_ESTABELECIMENTO' | 'SUPER_ADMIN' }>({
    email: '',
    password: '',
    estabelecimentoId: '',
    role: 'ADMIN_ESTABELECIMENTO'
  })
  const [editingAdmin, setEditingAdmin] = useState<any | null>(null)

  async function load() {
    const r = await fetch('/api/super-admin/estabelecimentos')
    const d = await r.json()
    setList(d.estabelecimentos || [])
    const ra = await fetch('/api/super-admin/admins')
    const da = await ra.json()
    setAdmins(da.admins || [])
  }

  async function create() {
    const r = await fetch('/api/super-admin/estabelecimentos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    })
    if (r.ok) {
      setForm({ nome: '', slug: '', perfil: 'LANCHONETE', ativo: true })
      load()
    }
  }

  async function update() {
    if (!editing) return
    const r = await fetch('/api/super-admin/estabelecimentos', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: editing.id,
        nome: editing.nome,
        slug: editing.slug,
        perfil: editing.perfil,
        ativo: editing.ativo
      })
    })
    if (r.ok) {
      setEditing(null)
      load()
    }
  }

  useEffect(() => {
    load()
  }, [])

  return (
    <main className="min-h-screen p-6" style={{ backgroundColor: '#f7f7f7' }}>
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <div className="text-2xl font-semibold">Super Admin</div>
          <div className="text-sm text-gray-600">Gerenciamento de estabelecimentos, perfis e ativação</div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <section className="bg-white rounded-xl shadow p-4">
            <div className="text-lg font-medium mb-3">Criar Estabelecimento</div>
            <div className="grid gap-2">
              <label>
                <div className="text-sm text-gray-700">Nome</div>
                <input
                  className="w-full border rounded-lg px-3 py-2"
                  value={form.nome}
                  onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                />
              </label>
              <label>
                <div className="text-sm text-gray-700">Slug</div>
                <input
                  className="w-full border rounded-lg px-3 py-2"
                  value={form.slug}
                  onChange={e => setForm(f => ({ ...f, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') }))}
                />
              </label>
              <label>
                <div className="text-sm text-gray-700">Perfil</div>
                <select
                  className="w-full border rounded-lg px-3 py-2"
                  value={form.perfil}
                  onChange={e => setForm(f => ({ ...f, perfil: e.target.value as any }))}
                >
                  {perfis.map(p => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.ativo}
                  onChange={e => setForm(f => ({ ...f, ativo: e.target.checked }))}
                />
                <span className="text-sm text-gray-700">Ativo</span>
              </label>
              <button className="px-3 py-2 rounded-lg bg-black text-white" onClick={create}>
                Criar
              </button>
            </div>
          </section>

          <section className="bg-white rounded-xl shadow p-4">
            <div className="text-lg font-medium mb-3">Editar Estabelecimento</div>
            {editing ? (
              <div className="grid gap-2">
                <label>
                  <div className="text-sm text-gray-700">Nome</div>
                  <input
                    className="w-full border rounded-lg px-3 py-2"
                    value={editing.nome}
                    onChange={e => setEditing(s => s && { ...s, nome: e.target.value })}
                  />
                </label>
                <label>
                  <div className="text-sm text-gray-700">Slug</div>
                  <input
                    className="w-full border rounded-lg px-3 py-2"
                    value={editing.slug}
                    onChange={e => setEditing(s => s && { ...s, slug: e.target.value })}
                  />
                </label>
                <label>
                  <div className="text-sm text-gray-700">Perfil</div>
                  <select
                    className="w-full border rounded-lg px-3 py-2"
                    value={editing.perfil}
                    onChange={e => setEditing(s => s && { ...s, perfil: e.target.value as any })}
                  >
                    {perfis.map(p => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editing.ativo}
                    onChange={e => setEditing(s => s && { ...s, ativo: e.target.checked })}
                  />
                  <span className="text-sm text-gray-700">Ativo</span>
                </label>
                <div className="flex gap-2">
                  <button className="px-3 py-2 rounded-lg bg-black text-white" onClick={update}>
                    Salvar
                  </button>
                  <button className="px-3 py-2 rounded-lg border" onClick={() => setEditing(null)}>
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-sm text-gray-600">Selecione um estabelecimento na lista para editar</div>
            )}
          </section>
        </div>

        <section className="bg-white rounded-xl shadow p-4 mt-6">
          <div className="text-lg font-medium mb-3">Estabelecimentos</div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left">
                  <th className="py-2 px-2">Nome</th>
                  <th className="py-2 px-2">Slug</th>
                  <th className="py-2 px-2">Perfil</th>
                  <th className="py-2 px-2">Ativo</th>
                  <th className="py-2 px-2">Criado</th>
                  <th className="py-2 px-2">Ações</th>
                </tr>
              </thead>
              <tbody>
                {list.map(est => (
                  <tr key={est.id} className="border-t">
                    <td className="py-2 px-2">{est.nome}</td>
                    <td className="py-2 px-2">{est.slug}</td>
                    <td className="py-2 px-2">{est.perfil}</td>
                    <td className="py-2 px-2">
                      <span
                        className={`px-2 py-1 rounded ${est.ativo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}
                      >
                        {est.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="py-2 px-2">{new Date(est.createdAt).toLocaleString()}</td>
                    <td className="py-2 px-2">
                      <div className="flex gap-2">
                        <button className="px-3 py-1 rounded border" onClick={() => setEditing(est)}>
                          Editar
                        </button>
                        <button
                          className="px-3 py-1 rounded border"
                          onClick={async () => {
                            await fetch('/api/super-admin/estabelecimentos', {
                              method: 'PUT',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ id: est.id, ativo: !est.ativo, nome: est.nome, slug: est.slug, perfil: est.perfil })
                            })
                            load()
                          }}
                        >
                          {est.ativo ? 'Desativar' : 'Ativar'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="bg-white rounded-xl shadow p-4 mt-6">
          <div className="text-lg font-medium mb-3">Usuários Admin</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="text-sm font-medium mb-2">Criar Usuário Admin</div>
              <div className="grid gap-2">
                <label>
                  <div className="text-sm text-gray-700">Email</div>
                  <input className="w-full border rounded-lg px-3 py-2" value={adminForm.email} onChange={e => setAdminForm(f => ({ ...f, email: e.target.value }))} />
                </label>
                <label>
                  <div className="text-sm text-gray-700">Senha</div>
                  <input type="password" className="w-full border rounded-lg px-3 py-2" value={adminForm.password} onChange={e => setAdminForm(f => ({ ...f, password: e.target.value }))} />
                </label>
                <label>
                  <div className="text-sm text-gray-700">Estabelecimento</div>
                  <select className="w-full border rounded-lg px-3 py-2" value={adminForm.estabelecimentoId} onChange={e => setAdminForm(f => ({ ...f, estabelecimentoId: e.target.value }))}>
                    <option value="">Selecione</option>
                    {list.map(est => (
                      <option key={est.id} value={est.id}>
                        {est.nome} ({est.slug})
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <div className="text-sm text-gray-700">Papel</div>
                  <select className="w-full border rounded-lg px-3 py-2" value={adminForm.role} onChange={e => setAdminForm(f => ({ ...f, role: e.target.value as any }))}>
                    <option value="ADMIN_ESTABELECIMENTO">ADMIN_ESTABELECIMENTO</option>
                    <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                  </select>
                </label>
                <button
                  className="px-3 py-2 rounded-lg bg-black text-white"
                  onClick={async () => {
                    const r = await fetch('/api/super-admin/admins', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(adminForm)
                    })
                    if (r.ok) {
                      setAdminForm({ email: '', password: '', estabelecimentoId: '', role: 'ADMIN_ESTABELECIMENTO' })
                      load()
                    }
                  }}
                >
                  Criar
                </button>
              </div>
            </div>
            <div>
              <div className="text-sm font-medium mb-2">Editar Usuário Admin</div>
              {editingAdmin ? (
                <div className="grid gap-2">
                  <label>
                    <div className="text-sm text-gray-700">Email</div>
                    <input className="w-full border rounded-lg px-3 py-2" value={editingAdmin.email} onChange={e => setEditingAdmin((s: any) => ({ ...s, email: e.target.value }))} />
                  </label>
                  <label>
                    <div className="text-sm text-gray-700">Nova Senha (opcional)</div>
                    <input type="password" className="w-full border rounded-lg px-3 py-2" onChange={e => setEditingAdmin((s: any) => ({ ...s, password: e.target.value }))} />
                  </label>
                  <label>
                    <div className="text-sm text-gray-700">Estabelecimento</div>
                    <select
                      className="w-full border rounded-lg px-3 py-2"
                      value={editingAdmin.estabelecimentoId || ''}
                      onChange={e => setEditingAdmin((s: any) => ({ ...s, estabelecimentoId: e.target.value }))}
                    >
                      <option value="">Selecione</option>
                      {list.map(est => (
                        <option key={est.id} value={est.id}>
                          {est.nome} ({est.slug})
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <div className="text-sm text-gray-700">Papel</div>
                    <select className="w-full border rounded-lg px-3 py-2" value={editingAdmin.role} onChange={e => setEditingAdmin((s: any) => ({ ...s, role: e.target.value }))}>
                      <option value="ADMIN_ESTABELECIMENTO">ADMIN_ESTABELECIMENTO</option>
                      <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                    </select>
                  </label>
                  <div className="flex gap-2">
                    <button
                      className="px-3 py-2 rounded-lg bg-black text-white"
                      onClick={async () => {
                        const r = await fetch('/api/super-admin/admins', {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            id: editingAdmin.id,
                            email: editingAdmin.email,
                            password: editingAdmin.password,
                            estabelecimentoId: editingAdmin.estabelecimentoId || null,
                            role: editingAdmin.role
                          })
                        })
                        if (r.ok) {
                          setEditingAdmin(null)
                          load()
                        }
                      }}
                    >
                      Salvar
                    </button>
                    <button className="px-3 py-2 rounded-lg border" onClick={() => setEditingAdmin(null)}>
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-gray-600">Selecione um usuário na lista para editar</div>
              )}
            </div>
          </div>
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left">
                  <th className="py-2 px-2">Email</th>
                  <th className="py-2 px-2">Papel</th>
                  <th className="py-2 px-2">Estabelecimento</th>
                  <th className="py-2 px-2">Criado</th>
                  <th className="py-2 px-2">Ações</th>
                </tr>
              </thead>
              <tbody>
                {admins.map(a => (
                  <tr key={a.id} className="border-t">
                    <td className="py-2 px-2">{a.email}</td>
                    <td className="py-2 px-2">{a.role}</td>
                    <td className="py-2 px-2">{a.estabelecimento ? `${a.estabelecimento.nome} (${a.estabelecimento.slug})` : '-'}</td>
                    <td className="py-2 px-2">{new Date(a.createdAt).toLocaleString()}</td>
                    <td className="py-2 px-2">
                      <div className="flex gap-2">
                        <button className="px-3 py-1 rounded border" onClick={() => setEditingAdmin(a)}>
                          Editar
                        </button>
                        <button
                          className="px-3 py-1 rounded border"
                          onClick={async () => {
                            await fetch('/api/super-admin/admins', {
                              method: 'DELETE',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ id: a.id })
                            })
                            load()
                          }}
                        >
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  )
}
