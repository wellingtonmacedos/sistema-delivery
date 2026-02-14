import Link from 'next/link'

export default function HomePage() {
  return (
    <main style={{ padding: 24 }}>
      <h1>Sistema Delivery</h1>
      <ul>
        <li>
          <Link href="/chat">Chatbot</Link>
        </li>
        <li>
          <Link href="/admin">Painel Administrativo</Link>
        </li>
      </ul>
    </main>
  )
}
