'use server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { sql, type Kind } from '@/lib/db'

const COLS = {
  gastos: ['tipo', 'nombre', 'unidades', 'fecha', 'monto', 'pagador'],
  ingresos: ['tipo', 'nombre', 'unidades', 'monto', 'fecha', 'metodo_pago', 'vendedor', 'comision', 'lugar'],
  productos: ['tipo', 'nombre'],
  producto_items: ['producto_id', 'gasto_tipo', 'gasto_nombre', 'cantidad'],
  params: ['kind', 'value'],
  unidades: ['producto_id', 'codigo'],
} as const
export type Table = keyof typeof COLS

function check(table: Table) {
  if (!Object.hasOwn(COLS, table)) throw new Error('tabla inválida')
  return table === 'producto_items' || table === 'unidades' ? '/productos' : `/${table}`
}

const codigos = (v: FormDataEntryValue | null) => [...new Set(String(v ?? '').split(/[\s,;]+/).filter(Boolean))]

export async function save(table: Table, fd: FormData) {
  const back = check(table)
  // el form de ingresos elige producto con un solo radio: ["tipo","nombre"]
  if (table === 'ingresos' && fd.get('producto')) {
    const [t, n] = JSON.parse(String(fd.get('producto')))
    fd.set('tipo', t); fd.set('nombre', n)
  }
  const row = Object.fromEntries(COLS[table].map(c => [c, String(fd.get(c) ?? '').trim()]))
  const id = fd.get('id')
  const [r] = id
    ? await sql`update ${sql(table)} set ${sql(row)} where id = ${String(id)} returning id`
    : await sql`insert into ${sql(table)} ${sql(row)} on conflict do nothing returning id`

  if (table === 'ingresos' && r) {
    // códigos vendidos: se liberan los anteriores y se asignan los del form (solo unidades libres de ese producto)
    await sql`update unidades set ingreso_id = null where ingreso_id = ${r.id}`
    const cs = codigos(fd.get('codigos'))
    if (cs.length) await sql`
      update unidades set ingreso_id = ${r.id}
      where codigo = any(${cs}) and ingreso_id is null
        and producto_id in (select id from productos where tipo = ${row.tipo} and nombre = ${row.nombre})`
  }
  revalidatePath('/', 'layout')
  redirect(back)
}

export async function del(table: Table, id: number) {
  check(table)
  await sql`delete from ${sql(table)} where id = ${id}`
  revalidatePath('/', 'layout')
}

// Arma stock: un código por línea/coma; sin códigos usa la cantidad.
export async function addStock(fd: FormData) {
  const producto_id = Number(fd.get('producto_id'))
  const cs = codigos(fd.get('codigos'))
  const n = Math.min(cs.length || Math.floor(Number(fd.get('cantidad')) || 0), 1000)
  const rows = Array.from({ length: n }, (_, i) => ({ producto_id, codigo: cs[i] ?? null }))
  if (rows.length) await sql`insert into unidades ${sql(rows)}`
  revalidatePath('/', 'layout')
}

// dónde se usa cada parámetro, para que renombrar actualice los registros existentes
const USES: Record<Kind, [string, string][]> = {
  gasto_tipo: [['gastos', 'tipo'], ['producto_items', 'gasto_tipo']],
  gasto_nombre: [['gastos', 'nombre'], ['producto_items', 'gasto_nombre']],
  producto_tipo: [['productos', 'tipo'], ['ingresos', 'tipo']],
  producto_nombre: [['productos', 'nombre'], ['ingresos', 'nombre']],
  metodo_pago: [['ingresos', 'metodo_pago']],
  vendedor: [['ingresos', 'vendedor']],
  pagador: [['gastos', 'pagador']],
}

export async function renameParam(id: number, fd: FormData) {
  const value = String(fd.get('value') ?? '').trim()
  if (!value) return
  await sql.begin(async t => {
    const tx = t as unknown as typeof sql
    const [p] = await tx<{ kind: Kind; value: string }[]>`select kind, value from params where id = ${id}`
    if (!p || p.value === value) return
    await tx`update params set value = ${value} where id = ${id}`
    for (const [tbl, col] of USES[p.kind]) await tx`update ${tx(tbl)} set ${tx(col)} = ${value} where ${tx(col)} = ${p.value}`
  })
  revalidatePath('/', 'layout')
}
