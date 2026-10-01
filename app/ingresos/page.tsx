import Link from 'next/link'
import { save } from '@/app/actions'
import { sql, params, $, num, fecha } from '@/lib/db'
import { Sel, In, Del, Grid } from '@/lib/ui'

const resumen = (by: string) => sql`
  select ${sql(by)} k, sum(unidades) u, sum(monto) m, sum(comision) c, sum(costo) co, sum(ganancia) g
  from ingresos_ganancia group by 1 order by g desc`

export default async function Ingresos({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  const { edit } = await searchParams
  const [p, rows, porProd, porVend, porMetodo] = await Promise.all([
    params(),
    sql`select * from ingresos_ganancia order by fecha desc, id desc`,
    sql`select tipo || ' · ' || nombre k, sum(unidades) u, sum(monto) m, sum(comision) c, sum(costo) co, sum(ganancia) g
        from ingresos_ganancia group by 1 order by g desc`,
    resumen('vendedor'),
    resumen('metodo_pago'),
  ])
  const e = rows.find(r => String(r.id) === edit)
  const head = ['', 'Unidades', 'Monto', 'Comisión', 'Costo', 'Ganancia']
  const fmt = (rs: typeof porProd) => rs.map(r => [r.k, num(r.u), $(r.m), $(r.c), $(r.co), $(r.g)])

  return (
    <>
      <h2>Ingresos</h2>
      <article>
        <form action={save.bind(null, 'ingresos')} key={edit}>
          {e && <input type="hidden" name="id" value={e.id} />}
          <div className="grid">
            <Sel label="Tipo" name="tipo" opts={p.producto_tipo} value={e?.tipo} />
            <Sel label="Nombre" name="nombre" opts={p.producto_nombre} value={e?.nombre} />
            <In label="Unidades" name="unidades" type="number" step="any" min="0.0001" defaultValue={e?.unidades ?? 1} />
            <In label="Monto total" name="monto" type="number" step="0.01" min="0" defaultValue={e?.monto} />
          </div>
          <div className="grid">
            <In label="Fecha" name="fecha" type="date" defaultValue={e ? fecha(e.fecha) : fecha(new Date())} />
            <Sel label="Método de pago" name="metodo_pago" opts={p.metodo_pago} value={e?.metodo_pago} />
            <Sel label="Vendedor" name="vendedor" opts={p.vendedor} value={e?.vendedor} />
            <In label="Comisión $" name="comision" type="number" step="0.01" min="0" defaultValue={e?.comision ?? 0} />
          </div>
          <button>{e ? 'Guardar cambios' : 'Agregar ingreso'}</button> {e && <Link href="/ingresos">Cancelar</Link>}
        </form>
      </article>

      <h3>Por producto</h3><Grid head={head} rows={fmt(porProd)} />
      <h3>Por vendedor</h3><Grid head={head} rows={fmt(porVend)} />
      <h3>Por método de pago</h3><Grid head={head} rows={fmt(porMetodo)} />

      <h3>Movimientos</h3>
      <Grid head={['Fecha', 'Producto', 'Unid.', 'Monto', 'Pago', 'Vendedor', 'Comisión', 'Costo', 'Ganancia', '', '']}
        rows={rows.map(r => [fecha(r.fecha), `${r.tipo} · ${r.nombre}${r.sin_producto ? ' ⚠️' : ''}`, num(r.unidades), $(r.monto),
          r.metodo_pago, r.vendedor, $(r.comision), $(r.costo), $(r.ganancia),
          <Link key="e" href={`/ingresos?edit=${r.id}`}>Editar</Link>, <Del key="d" table="ingresos" id={r.id} />])} />
      <small>⚠️ = no hay producto armado con ese tipo/nombre, el costo cuenta como $0.</small>
    </>
  )
}
