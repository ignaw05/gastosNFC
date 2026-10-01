import Link from 'next/link'
import { save } from '@/app/actions'
import { sql, params, $, num, fecha } from '@/lib/db'
import { Sel, In, Del, Grid } from '@/lib/ui'

export default async function Gastos({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  const { edit } = await searchParams
  const [p, rows, insumos] = await Promise.all([
    params(),
    sql`select * from gastos order by fecha desc, id desc`,
    sql`select * from costo_insumo order by tipo, nombre`,
  ])
  const e = rows.find(r => String(r.id) === edit)

  return (
    <>
      <h2>Gastos</h2>
      <article>
        <form action={save.bind(null, 'gastos')} key={edit}>
          {e && <input type="hidden" name="id" value={e.id} />}
          <div className="grid">
            <Sel label="Tipo" name="tipo" opts={p.gasto_tipo} value={e?.tipo} />
            <Sel label="Nombre" name="nombre" opts={p.gasto_nombre} value={e?.nombre} />
            <In label="Unidades" name="unidades" type="number" step="any" min="0.0001" defaultValue={e?.unidades} />
            <In label="Monto total" name="monto" type="number" step="0.01" min="0" defaultValue={e?.monto} />
            <In label="Fecha" name="fecha" type="date" defaultValue={e ? fecha(e.fecha) : fecha(new Date())} />
          </div>
          <button>{e ? 'Guardar cambios' : 'Agregar gasto'}</button> {e && <Link href="/gastos">Cancelar</Link>}
        </form>
      </article>

      <h3>Costo por insumo</h3>
      <Grid head={['Tipo', 'Nombre', 'Unidades', 'Total', 'Costo unitario prom.']}
        rows={insumos.map(r => [r.tipo, r.nombre, num(r.unidades), $(r.monto), $(r.costo)])} />

      <h3>Movimientos · total {$(rows.reduce((s, r) => s + Number(r.monto), 0))}</h3>
      <Grid head={['Fecha', 'Tipo', 'Nombre', 'Unidades', 'Monto', 'Unitario', '', '']}
        rows={rows.map(r => [fecha(r.fecha), r.tipo, r.nombre, num(r.unidades), $(r.monto), $(r.monto_unitario),
          <Link key="e" href={`/gastos?edit=${r.id}`}>Editar</Link>, <Del key="d" table="gastos" id={r.id} />])} />
    </>
  )
}
