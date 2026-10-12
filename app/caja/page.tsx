import Link from 'next/link'
import { save } from '@/app/actions'
import { sql, params, $, fecha } from '@/lib/db'
import { Head, Sel, In, Del, Grid, Kpi } from '@/lib/ui'

const ORIGEN: Record<string, string> = { ingreso: 'Venta', comision: 'Comisión', gasto: 'Gasto', transferencia: 'Transferencia', retiro: 'Retiro', aporte: 'Aporte' }

export default async function Caja({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const { m } = await searchParams
  const [p, saldos, socios, [gan], movs] = await Promise.all([
    params(),
    sql`select medio, sum(monto) s from caja_mov group by 1 order by s desc`,
    sql`select persona, sum(monto) filter (where tipo = 'aporte') ap, sum(monto) filter (where tipo = 'retiro') re
        from caja group by 1 order by re desc nulls last`,
    sql`select coalesce(sum(ganancia), 0) g from ingresos_ganancia`,
    // saldo acumulado (del medio filtrado o del total) en orden cronológico
    sql`select *, sum(monto) over (order by fecha, origen, id, monto rows unbounded preceding) saldo
        from caja_mov where ${m ? sql`medio = ${m}` : sql`true`}
        order by fecha desc, origen desc, id desc, monto desc`,
  ])
  const total = saldos.reduce((s, r) => s + Number(r.s), 0)
  const retirado = socios.reduce((s, r) => s + Number(r.re ?? 0), 0)
  const aportado = socios.reduce((s, r) => s + Number(r.ap ?? 0), 0)
  // medios configurados sin movimientos también aparecen, en $0
  const medios = [...saldos, ...p.metodo_pago.filter(x => !saldos.some(r => r.medio === x)).map(medio => ({ medio, s: 0 }))]
  const hoy = fecha(new Date())
  const tab = (v: string | undefined, l: string) =>
    <Link key={l} href={v ? `/caja?m=${encodeURIComponent(v)}` : '/caja'} aria-current={m === v ? 'page' : undefined} scroll={false}>{l}</Link>

  return (
    <>
      <Head eyebrow="Plata" title="Caja" />

      <div className="grid" style={{ ['--min' as string]: '160px' }}>
        <Kpi label="En caja" value={$(total)} sub="suma de todos los medios" dark />
        <Kpi label="Ganancia retirada" value={$(retirado)} className="out" />
        <Kpi label="Ganancia sin retirar" value={$(Number(gan.g) - retirado)} sub={`ganancia s/ventas ${$(gan.g)}`} />
        <Kpi label="Aportado por socios" value={$(aportado)} className="in" />
      </div>

      <section className="card">
        <h2>Por medio de pago</h2>
        <div className="grid" style={{ ['--min' as string]: '160px' }}>
          {medios.map(r => <Kpi key={r.medio} label={r.medio} value={$(r.s)} className={Number(r.s) < 0 ? 'out' : ''} />)}
        </div>
        {medios.some(r => r.medio === 'Sin medio') && <p className="muted" style={{ margin: 0 }}>“Sin medio” son gastos viejos sin asignar: editalos en <Link href="/gastos">Gastos</Link>.</p>}
      </section>

      <div className="grid" style={{ ['--min' as string]: '280px' }}>
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
        <form action={save.bind(null, 'caja')} className="card">
          <h2>Retirar ganancia</h2>
          <input type="hidden" name="tipo" value="retiro" />
          <div className="fields">
            <Sel label="Quién retira" name="persona" opts={p.pagador} />
            <Sel label="De qué medio" name="desde" opts={p.metodo_pago} />
            <In label="Monto" name="monto" type="number" step="0.01" min="0.01" />
            <In label="Fecha" name="fecha" type="date" defaultValue={hoy} />
            <In label="Nota" name="nota" required={false} className="full" />
            <div className="actions" style={{ justifyContent: 'flex-start' }}><button>Retirar</button></div>
          </div>
        </form>
        <form action={save.bind(null, 'caja')} className="card">
          <h2>Aportar plata</h2>
          <input type="hidden" name="tipo" value="aporte" />
          <div className="fields">
            <Sel label="Quién aporta" name="persona" opts={p.pagador} />
            <Sel label="A qué medio" name="hacia" opts={p.metodo_pago} />
            <In label="Monto" name="monto" type="number" step="0.01" min="0.01" />
            <In label="Fecha" name="fecha" type="date" defaultValue={hoy} />
            <In label="Nota" name="nota" required={false} className="full" />
            <div className="actions" style={{ justifyContent: 'flex-start' }}><button>Aportar</button></div>
          </div>
        </form>
      </div>

      <section className="card">
        <h2>Por socio</h2>
        <Grid head={['Socio', '$Aportó', '$Retiró', '$Neto recibido']}
          rows={socios.map(r => [<strong key="p">{r.persona}</strong>, $(r.ap), $(r.re), <strong key="n">{$(Number(r.re ?? 0) - Number(r.ap ?? 0))}</strong>])} />
        {!socios.length && <p className="muted">Todavía no hay retiros ni aportes.</p>}
      </section>

      <section className="card">
        <div className="row"><h2>Historial</h2>
          <nav className="tabs">{[tab(undefined, 'Todo'), ...medios.map(r => tab(r.medio, r.medio))]}</nav>
        </div>
        <Grid head={['Fecha', 'Movimiento', 'Detalle', ...(m ? [] : ['Medio']), '$Monto', '$Saldo', '']}
          rows={movs.map(r => [<span key="f" className="num muted">{fecha(r.fecha)}</span>,
            <strong key="o">{ORIGEN[r.origen]}</strong>, <span key="d" className="muted">{r.detalle}</span>, ...(m ? [] : [r.medio]),
            <strong key="m" className={Number(r.monto) < 0 ? 'out' : 'in'}>{Number(r.monto) < 0 ? '− ' : '+ '}{$(Math.abs(r.monto))}</strong>,
            $(r.saldo),
            ['transferencia', 'retiro', 'aporte'].includes(r.origen) ? <Del key="x" table="caja" id={r.id} /> : null])} />
      </section>
    </>
  )
}
