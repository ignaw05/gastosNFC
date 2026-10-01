'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const LINKS: [string, string, string][] = [
  ['/', 'General', 'M3 3h7v9H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 16h7v5H3z'],
  ['/gastos', 'Gastos', 'M12 5v14M19 12l-7 7-7-7'],
  ['/ingresos', 'Ingresos', 'M12 19V5M5 12l7-7 7 7'],
  ['/productos', 'Productos', 'M21 8l-9-5-9 5 9 5 9-5zM3 8v8l9 5 9-5V8'],
  ['/params', 'Parámetros', 'M4 6h16M4 12h10M4 18h6'],
]

export function Nav() {
  const path = usePathname()
  return (
    <nav>
      {LINKS.map(([href, label, d]) => (
        <Link key={href} href={href} aria-current={path === href ? 'page' : undefined}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
          {label}
        </Link>
      ))}
    </nav>
  )
}
