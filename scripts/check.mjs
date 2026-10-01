// Verifica el cálculo de costos con el ejemplo de los atriles/stickers, en un schema temporal (no toca datos reales).
import postgres from 'postgres'
import { readFileSync } from 'node:fs'
import assert from 'node:assert'

const sql = postgres(process.env.DATABASE_URL ?? process.env.DATABASE_URL_DATABASE_URL, { max: 1, onnotice: () => {} })
await sql`drop schema if exists check_tmp cascade`
await sql`create schema check_tmp`
await sql`set search_path to check_tmp`
await sql.unsafe(readFileSync(new URL('../schema.sql', import.meta.url), 'utf8'))

const g = (nombre, unidades, monto) => sql`insert into gastos (tipo, nombre, unidades, fecha, monto) values ('Insumo', ${nombre}, ${unidades}, now(), ${monto})`
await g('Atril', 30, 100)
await g('Sticker', 10, 10); await g('Sticker', 10, 10)
await g('Sticker', 5, 6); await g('Sticker', 5, 6)

const [{ id }] = await sql`insert into productos (tipo, nombre) values ('Tarjeta', 'Genérico') returning id`
await sql`insert into producto_items (producto_id, gasto_tipo, gasto_nombre, cantidad) values
  (${id}, 'Insumo', 'Atril', 1), (${id}, 'Insumo', 'Sticker', 2)`
await sql`insert into ingresos (tipo, nombre, unidades, monto, fecha, metodo_pago, vendedor, comision)
  values ('Tarjeta', 'Genérico', 3, 50, now(), 'Efectivo', 'Yo', 5)`

const [st] = await sql`select costo from costo_insumo where nombre = 'Sticker'`
assert.equal(Number(st.costo).toFixed(4), (32 / 30).toFixed(4))
const [pr] = await sql`select costo from costo_producto`
assert.equal(Number(pr.costo).toFixed(4), (100 / 30 + 2 * 32 / 30).toFixed(4))
const [ing] = await sql`select costo, ganancia from ingresos_ganancia`
assert.equal(Number(ing.ganancia).toFixed(2), (50 - 5 - 3 * Number(pr.costo)).toFixed(2))

await sql`drop schema check_tmp cascade`
await sql.end()
console.log('ok · costo producto', Number(pr.costo).toFixed(2), '· ganancia', Number(ing.ganancia).toFixed(2))
