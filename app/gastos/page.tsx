import Link from 'next/link'
import { save } from '@/app/actions'
import { sql, params, $, num, fecha } from '@/lib/db'
import { Head, Sel, In, Del, Grid, Kpi } from '@/lib/ui'

export default async function Gastos({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  const { edit } = await searchParams
  const [p, rows, insumos, porPagador] = await Promise.all([
    params(),
    sql`select * from gastos order by fecha desc, id desc`,
    sql`select * from costo_insumo order by tipo, nombre`,
    sql`select coalesce(pagador, '—') k, count(*) n, sum(monto) m from gastos group by 1 order by m desc`,
  ])
  const e = rows.find(r => String(r.id) === edit)

  return (
    <>
      <Head eyebrow="Compras" title="Gastos" />
      <form action={save.bind(null, 'gastos')} key={edit} className="card">
        <h2>{e ? 'Editar gasto' : 'Nuevo gasto'}</h2>
        {e && <input type="hidden" name="id" value={e.id} />}
        <div className="fields">
          <Sel label="Tipo" name="tipo" opts={p.gasto_tipo} value={e?.tipo} />
          <Sel label="Nombre" name="nombre" opts={p.gasto_nombre} value={e?.nombre} />
          <In label="Unidades" name="unidades" type="number" step="any" min="0.0001" defaultValue={e?.unidades} />
          <In label="Monto total" name="monto" type="number" step="0.01" min="0" defaultValue={e?.monto} />
          <Sel label="Pagó" name="pagador" opts={p.pagador} value={e?.pagador ?? undefined} />
          <In label="Fecha" name="fecha" type="date" defaultValue={e ? fecha(e.fecha) : fecha(new Date())} />
          <div className="actions" style={{ justifyContent: 'flex-start' }}>
            <button>{e ? 'Guardar' : 'Agregar'}</button>
            {e && <Link href="/gastos" className="btn ghost">Cancelar</Link>}
          </div>
        </div>
      </form>

      <div className="grid" style={{ ['--cols' as string]: 3 }}>
        <Kpi label="Total gastado" value={$(rows.reduce((s, r) => s + Number(r.monto), 0))} className="out" />
        <Kpi label="Compras" value={String(rows.length)} />
        <Kpi label="Insumos distintos" value={String(insumos.length)} />
      </div>

      <section className="card">
        <h2>Por quién pagó</h2>
        <Grid head={['Pagó', '#Compras', '$Total']} rows={porPagador.map(r => [<strong key="k">{r.k}</strong>, r.n, $(r.m)])} />
      </section>

      <section className="card">
        <h2>Costo por insumo</h2>
        <Grid head={['Insumo', '#Unidades', '$Total', '$Costo unit. prom.']}
          rows={insumos.map(r => [<><span className="muted">{r.tipo} · </span><strong>{r.nombre}</strong></>, num(r.unidades), $(r.monto), $(r.costo)])} />
      </section>

      <section className="card">
        <h2>Movimientos</h2>
        <Grid head={['Fecha', 'Insumo', 'Pagó', '#Unidades', '$Monto', '$Unitario', '']}
          rows={rows.map(r => [<span key="f" className="num muted">{fecha(r.fecha)}</span>,
            <><span className="muted">{r.tipo} · </span><strong>{r.nombre}</strong></>, r.pagador ?? '—',
            num(r.unidades), <span key="m" className="out">{$(r.monto)}</span>, $(r.monto_unitario),
            <div key="a" className="actions"><Link href={`/gastos?edit=${r.id}`}>Editar</Link><Del table="gastos" id={r.id} /></div>])} />
      </section>
    </>
  )
}
