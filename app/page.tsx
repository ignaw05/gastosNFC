import Link from 'next/link'
import { sql, $, num, fecha } from '@/lib/db'
import { Head, Grid, Kpi, ICON } from '@/lib/ui'
import { Spark, Bars, Donut } from '@/lib/charts'

export default async function General({ searchParams }: { searchParams: Promise<{ f?: string }> }) {
  const { f } = await searchParams
  const [meses, porProd, insumos, movs, [enCaja]] = await Promise.all([
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
    sql`select coalesce(sum(monto), 0) s from caja_mov`,
  ])
  const t = (k: string) => meses.reduce((s, r) => s + Number(r[k]), 0)
  const ing = t('ingresos'), gan = t('ganancia')
  // series mensuales en orden cronológico para los gráficos
  const serie = meses.toReversed().map(r => ({ mes: r.mes as string, ingresos: Number(r.ingresos), gastos: Number(r.gastos), ganancia: Number(r.ganancia), caja: Number(r.caja) }))
  let acc = 0
  const acumulado = serie.map(r => ({ k: r.mes, v: acc += r.caja }))
  const sp = (k: 'ingresos' | 'gastos' | 'ganancia' | 'caja') => serie.map(r => ({ k: r.mes, v: r[k] }))
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

      <div className="grid" style={{ ['--min' as string]: '220px' }}>
        <Kpi label="Ingresos" value={$(ing)} icon={ICON.in} sub={`${num(t('u'))} unidades vendidas`}><Spark id="s-in" data={sp('ingresos')} /></Kpi>
        <Kpi label="Gastos" value={$(t('gastos'))} icon={ICON.out} sub={`comisiones ${$(t('comisiones'))}`}><Spark id="s-out" data={sp('gastos')} color="var(--c3)" /></Kpi>
        <Kpi label="Ganancia s/ventas" value={$(gan)} icon={ICON.trend} sub={ing ? `margen ${Math.round(gan / ing * 100)}%` : undefined}><Spark id="s-gan" data={sp('ganancia')} color="var(--c4)" /></Kpi>
        <Link href="/caja" style={{ display: 'contents', color: 'inherit' }}><Kpi label="En caja" value={$(enCaja.s)} icon={ICON.wallet} sub="ver caja y retiros →" dark><Spark id="s-caja" data={acumulado} color="#fff" /></Kpi></Link>
      </div>

      <div className="grid wide">
        <section className="card">
          <div className="row"><h2>Ingresos vs gastos por mes</h2>
            <div className="legend-row"><span><i style={{ background: 'var(--c1)' }} />Ingresos</span><span><i style={{ background: 'var(--c2)' }} />Gastos</span><span><i style={{ background: 'var(--c4)' }} />Ganancia</span></div>
          </div>
          {serie.length ? <Bars data={serie} x="mes" bars={[['ingresos', 'Ingresos'], ['gastos', 'Gastos']]} line={['ganancia', 'Ganancia']} /> : <p className="muted">Todavía no hay movimientos.</p>}
        </section>
        <section className="card">
          <div className="row"><h2>Ganancia por producto</h2><Link href="/productos">Ver productos</Link></div>
          {porProd.length ? <Donut data={porProd.map(r => ({ k: r.k, v: Number(r.g) }))} center={$(gan)} label="ganancia" /> : <p className="muted">Todavía no hay ventas.</p>}
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

      <div className="grid">
        <section className="card">
          <h2>Costo por insumo</h2>
          <Grid head={['Insumo', '#Unidades', '$Costo unit.']} rows={insumos.map(r => [<strong key="n">{r.nombre}</strong>, num(r.unidades), $(r.costo)])} />
        </section>
        <section className="card">
          <h2>Por mes</h2>
          <Grid head={['Mes', '$Ingresos', '$Comisiones', '$Gastos', '$Ganancia s/ventas', '$Flujo operativo']}
            rows={meses.map(r => [<strong key="m">{r.mes}</strong>, $(r.ingresos), $(r.comisiones), $(r.gastos), $(r.ganancia), $(r.caja)])} />
        </section>
      </div>
    </>
  )
}
