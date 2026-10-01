'use server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { sql } from '@/lib/db'

const COLS = {
  gastos: ['tipo', 'nombre', 'unidades', 'fecha', 'monto'],
  ingresos: ['tipo', 'nombre', 'unidades', 'monto', 'fecha', 'metodo_pago', 'vendedor', 'comision'],
  productos: ['tipo', 'nombre'],
  producto_items: ['producto_id', 'gasto_tipo', 'gasto_nombre', 'cantidad'],
  params: ['kind', 'value'],
} as const
export type Table = keyof typeof COLS

function check(table: Table) {
  if (!Object.hasOwn(COLS, table)) throw new Error('tabla inválida')
  return table === 'producto_items' ? '/productos' : `/${table}`
}

export async function save(table: Table, fd: FormData) {
  const back = check(table)
  const row = Object.fromEntries(COLS[table].map(c => [c, String(fd.get(c) ?? '').trim()]))
  const id = fd.get('id')
  if (id) await sql`update ${sql(table)} set ${sql(row)} where id = ${String(id)}`
  else await sql`insert into ${sql(table)} ${sql(row)} on conflict do nothing`
  revalidatePath('/', 'layout')
  redirect(back)
}

export async function del(table: Table, id: number) {
  check(table)
  await sql`delete from ${sql(table)} where id = ${id}`
  revalidatePath('/', 'layout')
}
