import Link from 'next/link'
import { save } from '@/app/actions'
import { sql, params, rango, $, fecha, type Rango } from '@/lib/db'
import { Head, Sel, In, Del, Grid, Kpi, ICON, Filtro } from '@/lib/ui'
import { Donut, Trend } from '@/lib/charts'

const ORIGEN: Record<string, string> = { ingreso: 'Venta', comision: 'Comisión', devolucion: 'Devolución gasto', transferencia: 'Transferencia', retiro: 'Retiro ganancia', aporte: 'Aporte' }

export default async function Caja({ searchParams }: { searchParams: Promise<Rango & { m?: string }> }) {
  const sp = await searchParams
  const { m } = sp
  const r = rango(sp)
  const [p, saldos, [tot], retiros, deudas, movs] = await Promise.all([
    params(),
    sql`select medio, sum(monto) s from caja_mov group by 1 order by s desc`,
    sql`select (select coalesce(sum(monto - comision), 0) from ingresos) ing, (select coalesce(sum(monto), 0) from gastos) gas`,
    sql`select persona, sum(monto) s from caja where tipo = 'retiro' group by 1`,
    sql`select pagador, sum(monto) s from gastos where devuelto_medio is null group by 1`,
    // saldo acumulado (del medio filtrado o del total) en orden cronológico; el filtro de fechas va después para no cortar el saldo
    sql`select * from (
          select *, sum(monto) over (order by fecha, origen, id, monto rows unbounded preceding) saldo
          from caja_mov where ${m ? sql`medio = ${m}` : sql`true`}) x
        where ${r.on('fecha')}
        order by fecha desc, origen desc, id desc, monto desc`,
  ])
  const by = (rs: typeof retiros, k: string) => Object.fromEntries(rs.map(x => [x[k] ?? '—', Number(x.s)])) as Record<string, number>
  const ret = by(retiros, 'persona'), deu = by(deudas, 'pagador')
  const ganancia = Number(tot.ing) - Number(tot.gas)
  const retirado = Object.values(ret).reduce((s, v) => s + v, 0)
  const deuda = Object.values(deu).reduce((s, v) => s + v, 0)
  const enMedios = saldos.reduce((s, x) => s + Number(x.s), 0)
  // ponytail: ganancia en partes iguales entre los socios cargados en Parámetros
  const socios = [...new Set([...p.pagador, ...Object.keys(ret), ...Object.keys(deu)])]
  const parte = p.pagador.length ? ganancia / p.pagador.length : 0
  const medios = [...saldos, ...p.metodo_pago.filter(x => !saldos.some(s => s.medio === x)).map(medio => ({ medio, s: 0 }))]
  const hoy = fecha(new Date())
  const porDia = new Map<string, number>()
  for (const x of movs) if (!porDia.has(fecha(x.fecha))) porDia.set(fecha(x.fecha), Number(x.saldo))
  const evolucion = [...porDia].reverse().map(([k, v]) => ({ k, v }))
  const qs = (v?: string) => new URLSearchParams(Object.entries({ m: v, mes: sp.mes, desde: sp.desde, hasta: sp.hasta }).filter(([, x]) => x) as [string, string][]).toString()
  const tab = (v: string | undefined, l: string) =>
    <Link key={l} href={`/caja?${qs(v)}`} aria-current={m === v ? 'page' : undefined} scroll={false}>{l}</Link>

  return (
    <>
      <Head eyebrow="Plata" title="Caja" />

      <div className="grid" style={{ ['--min' as string]: '200px' }}>
        <Kpi label="Ganancia" value={$(ganancia)} icon={ICON.trend} sub="ingresos − comisiones − gastos" />
        <Kpi label="Retirado" value={$(retirado)} icon={ICON.user} />
        <Kpi label="Se debe a socios" value={$(deuda)} icon={ICON.out} sub="gastos sin devolver" />
        <Kpi label="En caja" value={$(ganancia - retirado)} icon={ICON.wallet} sub={`en medios ${$(enMedios)} − deuda ${$(deuda)}`} dark />
      </div>

      <section className="card">
        <h2>Socios</h2>
        <Grid head={['Socio', '$Ganancia (parte)', '$Retirado', '$Puede retirar', '$Gastos a devolverle', '$Total a cobrar']}
          rows={socios.map(s => {
            const mia = p.pagador.includes(s) ? parte : 0, disp = mia - (ret[s] ?? 0)
            return [<strong key="s">{s}</strong>, $(mia), $(ret[s] ?? 0), $(disp), $(deu[s] ?? 0), <strong key="t">{$(disp + (deu[s] ?? 0))}</strong>]
          })} />
        <p className="muted">Los gastos se devuelven desde <Link href="/gastos">Gastos</Link>; acá se retira ganancia.</p>
      </section>

      <div className="grid wide">
        <section className="card">
          <div className="row"><h2>Evolución del saldo{m ? ` · ${m}` : ''}</h2><span className="pill">{$(evolucion.at(-1)?.v ?? 0)}</span></div>
          {evolucion.length > 1 ? <Trend data={evolucion} /> : <p className="muted">Faltan movimientos para graficar.</p>}
        </section>
        <section className="card">
          <h2>Plata por medio</h2>
          <Donut data={medios.map(x => ({ k: x.medio, v: Number(x.s) }))} center={$(enMedios)} label="en medios" />
        </section>
      </div>

      <div className="grid" style={{ ['--min' as string]: '280px' }}>
        <form action={save.bind(null, 'caja')} className="card">
          <h2>Retirar ganancia</h2>
          <div className="fields">
            <input type="hidden" name="tipo" value="retiro" />
            <Sel label="Quién retira" name="persona" opts={p.pagador} />
            <Sel label="De qué medio" name="desde" opts={p.metodo_pago} />
            <In label="Monto" name="monto" type="number" step="0.01" min="0.01" />
            <In label="Fecha" name="fecha" type="date" defaultValue={hoy} />
            <In label="Nota" name="nota" required={false} className="full" />
            <div className="actions" style={{ justifyContent: 'flex-start' }}><button>Retirar</button></div>
          </div>
        </form>
        <form action={save.bind(null, 'caja')} className="card">
          <h2>Transferir entre medios</h2>
          <input type="hidden" name="tipo" value="transferencia" />
          <div className="fields">
            <Sel label="Desde" name="desde" opts={p.metodo_pago} />
            <Sel label="Hacia" name="hacia" opts={p.metodo_pago} />
            <In label="Monto" name="monto" type="number" step="0.01" min="0.01" />
            <In label="Fecha" name="fecha" type="date" defaultValue={hoy} />
            <In label="Nota" name="nota" required={false} className="full" />
            <div className="actions" style={{ justifyContent: 'flex-start' }}><button>Transferir</button></div>
          </div>
        </form>
      </div>

      <Filtro path="/caja" r={r} />

      <section className="card">
        <div className="row"><h2>Historial</h2>
          <nav className="tabs">{[tab(undefined, 'Todo'), ...medios.map(x => tab(x.medio, x.medio))]}</nav>
        </div>
        <Grid head={['Fecha', 'Movimiento', 'Detalle', ...(m ? [] : ['Medio']), '$Monto', '$Saldo', '']}
          rows={movs.map(x => [<span key="f" className="num muted">{fecha(x.fecha)}</span>,
            <strong key="o">{ORIGEN[x.origen]}</strong>, <span key="d" className="muted">{x.detalle}</span>, ...(m ? [] : [x.medio]),
            <strong key="m" className={Number(x.monto) < 0 ? 'out' : 'in'}>{Number(x.monto) < 0 ? '− ' : '+ '}{$(Math.abs(x.monto))}</strong>,
            $(x.saldo),
            ['transferencia', 'retiro', 'aporte'].includes(x.origen) ? <Del key="x" table="caja" id={x.id} /> : null])} />
      </section>
    </>
  )
}
