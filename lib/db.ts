import postgres from 'postgres'

export const sql = postgres(process.env.DATABASE_URL!, { max: 1 })

export const KINDS = {
  gasto_tipo: 'Tipos de gasto',
  gasto_nombre: 'Nombres de gasto',
  producto_tipo: 'Tipos de producto',
  producto_nombre: 'Nombres de producto',
  metodo_pago: 'Métodos de pago',
  vendedor: 'Vendedores',
} as const
export type Kind = keyof typeof KINDS

export async function params() {
  const rows = await sql<{ kind: Kind; value: string }[]>`select kind, value from params order by value`
  const out = Object.fromEntries(Object.keys(KINDS).map(k => [k, [] as string[]])) as Record<Kind, string[]>
  for (const r of rows) out[r.kind].push(r.value)
  return out
}

const ars = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' })
export const $ = (n: unknown) => ars.format(Number(n ?? 0))
export const num = (n: unknown) => Number(Number(n ?? 0).toFixed(2)).toLocaleString('es-AR')
export const fecha = (d: Date) => d.toISOString().slice(0, 10)
