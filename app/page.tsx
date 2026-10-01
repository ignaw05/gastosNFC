import Link from 'next/link'
import { sql, $, num, fecha } from '@/lib/db'
import { Head, Grid, Kpi } from '@/lib/ui'

export default async function General({ searchParams }: { searchParams: Promise<{ f?: string }> }) {
  const { f } = await searchParams
  const [meses, porProd, insumos, movs] = await Promise.all([
    sql`
      with g as (select to_char(fecha, 'YYYY-MM') mes, sum(monto) gastos from gastos group by 1),
           i as (select to_char(fecha, 'YYYY-MM') mes, sum(monto) ingresos, sum(comision) comisiones, sum(ganancia) ganancia, sum(unidades) u
                 from ingresos_ganancia group by 1)
      select mes, coalesce(ingresos, 0) ingresos, coalesce(comisiones, 0) comisiones, coalesce(gastos, 0) gastos, coalesce(u, 0) u,
             coalesce(ganancia, 0) ganancia, coalesce(ingresos, 0) - coalesce(comisiones, 0) - coalesce(gastos, 0) caja
      from g full join i using (mes) order by mes desc`,
    sql`select tipo || ' · ' || nombre k, sum(ganancia) g from ingresos_ganancia group by 1 order by g desc`,
    sql`select * from costo_insumo order by tipo, nombre`,
    sql`
      select * from (
        select 'in' t, fecha, id, tipo || ' · ' || nombre d, unidades u, concat_ws(' · ', lugar, metodo_pago, vendedor) x, monto from ingresos
        union all
        select 'out', fecha, id, tipo || ' · ' || nombre, unidades, coalesce('pagó ' || pagador, ''), monto from gastos
      ) m where ${f === 'in' || f === 'out' ? sql`t = ${f}` : sql`true`}
      order by fecha desc, id desc limit 15`,
  ])
  const t = (k: string) => meses.reduce((s, r) => s + Number(r[k]), 0)
  const ing = t('ingresos'), gan = t('ganancia'), caja = t('caja')
  const max = Math.max(...porProd.map(r => Number(r.g)), 1)
  const tab = (v: string | undefined, l: string) =>
    <Link href={v ? `/?f=${v}` : '/'} aria-current={f === v ? 'page' : undefined} scroll={false}>{l}</Link>

  return (
    <>
      <Head eyebrow="Panel general" title="Resumen">
        <div className="actions">
          <Link href="/gastos" className="btn ghost">+ Gasto</Link>
          <Link href="/ingresos" className="btn">+ Ingreso</Link>
        </div>
      </Head>

      <div className="grid" style={{ ['--cols' as string]: 4 }}>
        <Kpi label="Ingresos" value={$(ing)} className="in" sub={`${num(t('u'))} unidades vendidas`} />
        <Kpi label="Gastos" value={$(t('gastos'))} className="out" sub={`comisiones ${$(t('comisiones'))}`} />
        <Kpi label="Ganancia s/ventas" value={$(gan)} sub={ing ? `margen ${Math.round(gan / ing * 100)}%` : undefined} />
        <Kpi label="Caja" value={$(caja)} sub="incluye stock sin vender" dark />
      </div>

      <div className="grid stack">
        <section className="card">
          <div className="row"><h2>Ganancia por producto</h2><Link href="/productos">Ver productos</Link></div>
          {porProd.map(r => (
            <div key={r.k}>
              <div className="row"><strong>{r.k}</strong><span className="num">{$(r.g)}</span></div>
              <div className="bar"><div style={{ width: `${Math.max(0, Number(r.g)) / max * 100}%` }} /></div>
            </div>
          ))}
          {!porProd.length && <p className="muted">Todavía no hay ventas.</p>}
        </section>
        <section className="card">
          <h2>Costo por insumo</h2>
          <Grid head={['Insumo', '#Unidades', '$Costo unit.']} rows={insumos.map(r => [<strong key="n">{r.nombre}</strong>, num(r.unidades), $(r.costo)])} />
        </section>
      </div>

      <section className="card">
        <div className="row"><h2>Últimos movimientos</h2><nav className="tabs">{tab(undefined, 'Todos')}{tab('in', 'Ingresos')}{tab('out', 'Gastos')}</nav></div>
        <Grid head={['Fecha', 'Detalle', '', '$Monto']}
          rows={movs.map(m => [<span key="f" className="num muted">{fecha(m.fecha)}</span>,
            <span key="d"><strong>{m.d}</strong> <span className="muted">· {num(m.u)} u</span></span>,
            <span key="x" className="muted">{m.x}</span>,
            <strong key="m" className={m.t}>{m.t === 'in' ? '+ ' : '− '}{$(m.monto)}</strong>])} />
      </section>

      <section className="card">
        <h2>Por mes</h2>
        <Grid head={['Mes', '$Ingresos', '$Comisiones', '$Gastos', '$Ganancia s/ventas', '$Caja']}
          rows={meses.map(r => [<strong key="m">{r.mes}</strong>, $(r.ingresos), $(r.comisiones), $(r.gastos), $(r.ganancia), $(r.caja)])} />
      </section>
    </>
  )
}
