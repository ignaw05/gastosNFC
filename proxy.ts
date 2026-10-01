import { NextRequest, NextResponse } from 'next/server'

// ponytail: HTTP Basic Auth (prompt nativo del navegador), usuario cualquiera + APP_PASSWORD.
export function proxy(req: NextRequest) {
  const [, b64] = req.headers.get('authorization')?.split(' ') ?? []
  const pass = b64 ? atob(b64).split(':').slice(1).join(':') : null
  if (process.env.APP_PASSWORD && pass === process.env.APP_PASSWORD) return NextResponse.next()
  return new NextResponse('Auth requerida', { status: 401, headers: { 'WWW-Authenticate': 'Basic realm="gastos"' } })
}

export const config = { matcher: '/((?!_next/static|_next/image|favicon.ico).*)' }
