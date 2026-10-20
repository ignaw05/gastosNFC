import Link from 'next/link'
import { save, devolver } from '@/app/actions'
import { sql, params, rango, $, num, fecha, type Rango } from '@/lib/db'
import { Head, Sel, In, Del, Grid, Kpi, ICON, Filtro } from '@/lib/ui'

export default async function Gastos({ searchParams }: { searchParams: Promise<Rango & { edit?: string }> }) {
  const sp = await searchParams
  const r = rango(sp)
  const [p, rows, insumos, porSocio] = await Promise.all([
    params(),
    sql`select * from gastos where ${r.on('fecha')} order by fecha desc, id desc`,
    sql`select tipo, nombre, sum(unidades) unidades, sum(monto) monto, sum(monto) / sum(unidades) costo
        from gastos where ${r.on('fecha')} group by 1, 2 order by 1, 2`,
    // rendición por socio: lo que puso, lo que ya se le devolvió y lo que se le debe
    sql`select coalesce(pagador, '—') k, count(*) n, sum(monto) m,
          coalesce(sum(monto) filter (where devuelto_medio is not null), 0) dev,
          coalesce(sum(monto) filter (where devuelto_medio is null), 0) pend
        from gastos where ${r.on('fecha')} group by 1 order by m desc`,
  ])
  const e = rows.find(x => String(x.id) === sp.edit)
  const total = rows.reduce((s, x) => s + Number(x.monto), 0)
  const pend = porSocio.reduce((s, x) => s + Number(x.pend), 0)
  const hoy = fecha(new Date())

  return (
    <>
      <Head eyebrow="Compras" title="Gastos" />
      <form action={save.bind(null, 'gastos')} key={sp.edit} className="card">
        <h2>{e ? 'Editar gasto' : 'Nuevo gasto'}</h2>
        {e && <input type="hidden" name="id" value={e.id} />}
        <div className="fields">
          <Sel label="Tipo" name="tipo" opts={p.gasto_tipo} value={e?.tipo} />
          <Sel label="Nombre" name="nombre" opts={p.gasto_nombre} value={e?.nombre} />
          <In label="Unidades" name="unidades" type="number" step="any" min="0.0001" defaultValue={e?.unidades} />
          <In label="Monto total" name="monto" type="number" step="0.01" min="0" defaultValue={e?.monto} />
          <Sel label="Pagó" name="pagador" opts={p.pagador} value={e?.pagador ?? undefined} />
          <In label="Fecha" name="fecha" type="date" defaultValue={e ? fecha(e.fecha) : hoy} />
          <div className="actions" style={{ justifyContent: 'flex-start' }}>
            <button>{e ? 'Guardar' : 'Agregar'}</button>
            {e && <Link href="/gastos" className="btn ghost">Cancelar</Link>}
          </div>
        </div>
      </form>

      <Filtro path="/gastos" r={r} />

      <div className="grid" style={{ ['--min' as string]: '160px' }}>
        <Kpi label="Total gastado" value={$(total)} icon={ICON.out} sub={`${rows.length} compras`} />
        <Kpi label="Pendiente de devolver" value={$(pend)} icon={ICON.user} dark />
      </div>

      <section className="card">
        <h2>Rendición por socio</h2>
        <Grid head={['Pagó', '#Compras', '$Gastó', '$Devuelto', '$Se le debe']}
          rows={porSocio.map(x => [<strong key="k">{x.k}</strong>, x.n, $(x.m), $(x.dev), <strong key="p" className={Number(x.pend) ? 'out' : undefined}>{$(x.pend)}</strong>])} />
      </section>

      <section className="card">
        <h2>Movimientos</h2>
        <Grid head={['Fecha', 'Insumo', 'Pagó', '#Unidades', '$Monto', 'Devolución', '']}
          rows={rows.map(x => [<span key="f" className="num muted">{fecha(x.fecha)}</span>,
            <><span className="muted">{x.tipo} · </span><strong>{x.nombre}</strong></>, x.pagador ?? '—',
            num(x.unidades), <span key="m" className="out">{$(x.monto)}</span>,
            x.devuelto_medio
              ? <form key="d" action={devolver.bind(null, x.id)} className="actions" style={{ justifyContent: 'flex-start' }}>
                  <span className="tag">devuelto {fecha(x.devuelto_fecha)} · {x.devuelto_medio}</span>
                  <button className="ghost" title="Deshacer devolución">Deshacer</button>
                </form>
              : <form key="d" action={devolver.bind(null, x.id)} className="actions" style={{ justifyContent: 'flex-start' }}>
                  <select name="medio" required defaultValue="" aria-label="Devolver desde"><option value="" disabled>desde…</option>{p.metodo_pago.map(o => <option key={o}>{o}</option>)}</select>
                  <input type="hidden" name="fecha" value={hoy} />
                  <button>Devolver</button>
                </form>,
            <div key="a" className="actions"><Link href={`/gastos?edit=${x.id}`}>Editar</Link><Del table="gastos" id={x.id} /></div>])} />
      </section>

      <section className="card">
        <h2>Costo por insumo</h2>
        <Grid head={['Insumo', '#Unidades', '$Total', '$Costo unit. prom.']}
          rows={insumos.map(x => [<><span className="muted">{x.tipo} · </span><strong>{x.nombre}</strong></>, num(x.unidades), $(x.monto), $(x.costo)])} />
      </section>
    </>
  )
}
