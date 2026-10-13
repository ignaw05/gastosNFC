import './globals.css'
import { Inter } from 'next/font/google'
import { Nav } from './nav'

const sans = Inter({ subsets: ['latin'], variable: '--font-sans' })

export const metadata = { title: 'Gastos NFC' }
export const dynamic = 'force-dynamic'

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={sans.variable}>
      <body>
        <div className="app">
          <aside className="side">
            <div className="brand"><i>N</i>Gastos NFC</div>
            <div className="side-label">Menú</div>
            <Nav />
          </aside>
          <main>{children}</main>
        </div>
      </body>
    </html>
  )
}
