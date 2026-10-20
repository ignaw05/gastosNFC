import postgres from 'postgres'

export const sql = postgres((process.env.DATABASE_URL ?? process.env.DATABASE_URL_DATABASE_URL)!, { max: 1, prepare: false }) // sin prepared statements: el pooler de Neon los cachea y rompen al cambiar el schema

export const KINDS = {
  gasto_tipo: 'Tipos de gasto',
  gasto_nombre: 'Nombres de gasto',
  producto_tipo: 'Tipos de producto',
  producto_nombre: 'Nombres de producto',
  metodo_pago: 'Medios de pago (caja)',
  vendedor: 'Vendedores',
  pagador: 'Socios (pagan gastos / retiran)',
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

// filtro de fechas (?mes=YYYY-MM o ?desde=&hasta=); on('fecha') arma el where. Sin filtro = todo.
export type Rango = { mes?: string; desde?: string; hasta?: string }
export function rango(sp: Rango) {
  const ok = (v?: string) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined)
  let desde = ok(sp.desde), hasta = ok(sp.hasta)
  if (sp.mes && /^\d{4}-\d{2}$/.test(sp.mes)) {
    const [y, m] = sp.mes.split('-').map(Number)
    desde = `${sp.mes}-01`; hasta = fecha(new Date(Date.UTC(y, m, 0)))
  }
  const on = (col: string) => sql`${sql(col)} between ${desde ?? '0001-01-01'} and ${hasta ?? '9999-12-31'}`
  return { desde, hasta, mes: sp.mes, activo: !!(desde || hasta), on }
}
