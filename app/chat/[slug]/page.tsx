import { prisma } from '@/lib/db'
import ChatPage from '../page'
import { notFound } from 'next/navigation'

export default async function ChatSlugPage({ params }: { params: { slug: string } }) {
  const est = await prisma.estabelecimento.findUnique({ where: { slug: params.slug } })
  if (!est) {
    notFound()
  }
  if (!est.ativo) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md text-center space-y-3">
          <div className="text-2xl font-semibold">Este estabelecimento está temporariamente indisponível.</div>
          <div className="text-sm text-gray-600">Tente novamente mais tarde.</div>
        </div>
      </main>
    )
  }
  return <ChatPage tenantSlug={params.slug} />
}
