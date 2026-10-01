import '@picocss/pico/css/pico.min.css'
import Link from 'next/link'

export const metadata = { title: 'Gastos NFC' }
export const dynamic = 'force-dynamic'

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <header className="container">
          <nav>
            <ul><li><strong>Gastos NFC</strong></li></ul>
            <ul>
              <li><Link href="/">General</Link></li>
              <li><Link href="/gastos">Gastos</Link></li>
              <li><Link href="/ingresos">Ingresos</Link></li>
              <li><Link href="/productos">Productos</Link></li>
              <li><Link href="/params">Parámetros</Link></li>
            </ul>
          </nav>
        </header>
        <main className="container">{children}</main>
      </body>
    </html>
  )
}
