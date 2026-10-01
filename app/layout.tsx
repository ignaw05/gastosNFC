import './globals.css'
import { Manrope, JetBrains_Mono } from 'next/font/google'
import { Nav } from './nav'

const sans = Manrope({ subsets: ['latin'], variable: '--font-sans' })
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' })

export const metadata = { title: 'Gastos NFC' }
export const dynamic = 'force-dynamic'

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${sans.variable} ${mono.variable}`}>
      <body>
        <div className="app">
          <aside className="side">
            <div className="brand"><i>N</i>Gastos NFC</div>
            <Nav />
          </aside>
          <main>{children}</main>
        </div>
      </body>
    </html>
  )
}
