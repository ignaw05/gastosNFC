import Link from 'next/link'
import { sql, rango, $, num, fecha, type Rango } from '@/lib/db'
import { Head, Grid, Kpi, ICON, Filtro } from '@/lib/ui'
import { Spark, Bars, Donut } from '@/lib/charts'

export default async function General({ searchParams }: { searchParams: Promise<Rango & { f?: string }> }) {
  const sp = await searchParams
  const { f } = sp
  const r = rango(sp)
  const [meses, porProd, movs] = await Promise.all([
    sql`
      with g as (select to_char(fecha, 'YYYY-MM') mes, sum(monto) gastos from gastos where ${r.on('fecha')} group by 1),
           i as (select to_char(fecha, 'YYYY-MM') mes, sum(monto) ingresos, sum(comision) comisiones, sum(unidades) u
                 from ingresos where ${r.on('fecha')} group by 1)
      select mes, coalesce(ingresos, 0) ingresos, coalesce(comisiones, 0) comisiones, coalesce(gastos, 0) gastos, coalesce(u, 0) u,
             coalesce(ingresos, 0) - coalesce(comisiones, 0) - coalesce(gastos, 0) ganancia
      from g full join i using (mes) order by mes desc`,
    sql`select tipo || ' · ' || nombre k, sum(monto) v from ingresos where ${r.on('fecha')} group by 1 order by v desc`,
    sql`
      select * from (
        select 'in' t, fecha, id, tipo || ' · ' || nombre d, unidades u, concat_ws(' · ', lugar, metodo_pago, vendedor) x, monto from ingresos
        union all
        select 'out', fecha, id, tipo || ' · ' || nombre, unidades, coalesce('pagó ' || pagador, ''), monto from gastos
      ) m where ${f === 'in' || f === 'out' ? sql`t = ${f}` : sql`true`} and ${r.on('fecha')}
      order by fecha desc, id desc limit ${r.activo ? 1000 : 15}`,
  ])
  const t = (k: string) => meses.reduce((s, r) => s + Number(r[k]), 0)
  const ing = t('ingresos'), gan = t('ganancia'), u = t('u')
  // series mensuales en orden cronológico para los gráficos
  const serie = meses.toReversed().map(r => ({ mes: r.mes as string, ingresos: Number(r.ingresos), gastos: Number(r.gastos), ganancia: Number(r.ganancia), u: Number(r.u) }))
  const spark = (k: 'ingresos' | 'gastos' | 'ganancia') => serie.map(r => ({ k: r.mes, v: r[k] }))
  const q = (v?: string) => '/?' + new URLSearchParams(Object.entries({ f: v, mes: sp.mes, desde: sp.desde, hasta: sp.hasta }).filter(([, x]) => x) as [string, string][])
  const tab = (v: string | undefined, l: string) =>
    <Link href={q(v)} aria-current={f === v ? 'page' : undefined} scroll={false}>{l}</Link>

  return (
    <>
      <Head eyebrow="Panel general" title="Resumen">
        <div className="actions">
          <Link href="/gastos" className="btn ghost">+ Gasto</Link>
          <Link href="/ingresos" className="btn">+ Ingreso</Link>
        </div>
      </Head>

      <Filtro path="/" r={r} />

      <div className="grid" style={{ ['--min' as string]: '220px' }}>
        <Kpi label="Ingresos" value={$(ing)} icon={ICON.in} sub={`${num(u)} unidades vendidas`}><Spark id="s-in" data={spark('ingresos')} /></Kpi>
        <Kpi label="Gastos" value={$(t('gastos'))} icon={ICON.out} sub={`+ comisiones ${$(t('comisiones'))}`}><Spark id="s-out" data={spark('gastos')} color="var(--c3)" /></Kpi>
        <Kpi label="Ganancia" value={$(gan)} icon={ICON.trend} sub={ing ? `ingresos − comisiones − gastos · margen ${Math.round(gan / ing * 100)}%` : undefined}><Spark id="s-gan" data={spark('ganancia')} color="var(--c4)" /></Kpi>
        <Link href="/caja" style={{ display: 'contents', color: 'inherit' }}><Kpi label="Ganancia unitaria prom." value={$(u ? gan / u : 0)} icon={ICON.box} sub="ganancia ÷ unidades · ver caja →" dark /></Link>
      </div>

      <div className="grid wide">
        <section className="card">
          <div className="row"><h2>Ingresos vs gastos por mes</h2>
            <div className="legend-row"><span><i style={{ background: 'var(--c1)' }} />Ingresos</span><span><i style={{ background: 'var(--c2)' }} />Gastos</span><span><i style={{ background: 'var(--c4)' }} />Ganancia</span></div>
          </div>
          {serie.length ? <Bars data={serie} x="mes" bars={[['ingresos', 'Ingresos'], ['gastos', 'Gastos']]} line={['ganancia', 'Ganancia']} /> : <p className="muted">Todavía no hay movimientos.</p>}
        </section>
        <section className="card">
          <div className="row"><h2>Ventas por producto</h2><Link href="/productos">Ver productos</Link></div>
          {porProd.length ? <Donut data={porProd.map(r => ({ k: r.k, v: Number(r.v) }))} center={$(ing)} label="vendido" /> : <p className="muted">Todavía no hay ventas.</p>}
        </section>
      </div>

      <section className="card">
        <div className="row"><h2>{r.activo ? 'Movimientos' : 'Últimos movimientos'}</h2><nav className="tabs">{tab(undefined, 'Todos')}{tab('in', 'Ingresos')}{tab('out', 'Gastos')}</nav></div>
        <Grid head={['Fecha', 'Detalle', '', '$Monto']}
          rows={movs.map(m => [<span key="f" className="num muted">{fecha(m.fecha)}</span>,
            <span key="d"><strong>{m.d}</strong> <span className="muted">· {num(m.u)} u</span></span>,
            <span key="x" className="muted">{m.x}</span>,
            <strong key="m" className={m.t}>{m.t === 'in' ? '+ ' : '− '}{$(m.monto)}</strong>])} />
      </section>

      <section className="card">
        <h2>Por mes</h2>
        <Grid head={['Mes', '$Ingresos', '$Comisiones', '$Gastos', '$Ganancia', '#Unidades', '$Ganancia unit.']}
          rows={meses.map(r => [<strong key="m">{r.mes}</strong>, $(r.ingresos), $(r.comisiones), $(r.gastos), <strong key="g">{$(r.ganancia)}</strong>, num(r.u), $(Number(r.u) ? r.ganancia / r.u : 0)])} />
      </section>
    </>
  )
}
