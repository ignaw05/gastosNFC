import Link from 'next/link'
import { save } from '@/app/actions'
import { sql, params, $, fecha } from '@/lib/db'
import { Head, Sel, In, Del, Grid, Kpi } from '@/lib/ui'

const ORIGEN: Record<string, string> = { ingreso: 'Venta', comision: 'Comisión', gasto: 'Gasto', transferencia: 'Transferencia', retiro: 'Retiro', aporte: 'Aporte' }

export default async function Caja({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const { m } = await searchParams
  const [p, saldos, socios, [tot], movs] = await Promise.all([
    params(),
    sql`select medio, sum(monto) s from caja_mov group by 1 order by s desc`,
    sql`select persona, sum(monto) re, count(*) n from caja where tipo = 'retiro' group by 1 order by re desc`,
    sql`select (select coalesce(sum(monto - comision), 0) from ingresos) ing, (select coalesce(sum(monto), 0) from gastos) gas`,
    // saldo acumulado (del medio filtrado o del total) en orden cronológico
    sql`select *, sum(monto) over (order by fecha, origen, id, monto rows unbounded preceding) saldo
        from caja_mov where ${m ? sql`medio = ${m}` : sql`true`}
        order by fecha desc, origen desc, id desc, monto desc`,
  ])
  const total = saldos.reduce((s, r) => s + Number(r.s), 0)
  const retirado = socios.reduce((s, r) => s + Number(r.re), 0)
  // medios configurados sin movimientos también aparecen, en $0
  const medios = [...saldos, ...p.metodo_pago.filter(x => !saldos.some(r => r.medio === x)).map(medio => ({ medio, s: 0 }))]
  const hoy = fecha(new Date())
  const tab = (v: string | undefined, l: string) =>
    <Link key={l} href={v ? `/caja?m=${encodeURIComponent(v)}` : '/caja'} aria-current={m === v ? 'page' : undefined} scroll={false}>{l}</Link>

  return (
    <>
      <Head eyebrow="Plata" title="Caja" />

      <div className="grid" style={{ ['--min' as string]: '160px' }}>
        <Kpi label="Ingresos" value={$(tot.ing)} className="in" sub="ventas − comisiones" />
        <Kpi label="Gastos" value={$(tot.gas)} className="out" />
        <Kpi label="Retirado" value={$(retirado)} className="out" />
        <Kpi label="En caja" value={$(total)} sub="ingresos − gastos − retiros" dark />
      </div>

      <section className="card">
        <h2>Por medio de pago</h2>
        <div className="grid" style={{ ['--min' as string]: '160px' }}>
          {medios.map(r => <Kpi key={r.medio} label={r.medio} value={$(r.s)} className={Number(r.s) < 0 ? 'out' : ''} />)}
        </div>
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
          <h2>Retirar plata</h2>
          <div className="fields">
            <input type="hidden" name="tipo" value="retiro" />
            <Sel label="Quién retira" name="persona" opts={p.pagador} />
            <Sel label="De qué medio" name="desde" opts={p.metodo_pago} />
            <In label="Monto" name="monto" type="number" step="0.01" min="0.01" />
            <In label="Fecha" name="fecha" type="date" defaultValue={hoy} />
            <In label="Nota" name="nota" required={false} className="full" placeholder="Ej: cubrir costos, ganancia" />
            <div className="actions" style={{ justifyContent: 'flex-start' }}><button>Retirar</button></div>
          </div>
        </form>
      </div>

      <section className="card">
        <h2>Retiros por persona</h2>
        <Grid head={['Persona', '#Retiros', '$Total']} rows={socios.map(r => [<strong key="p">{r.persona}</strong>, r.n, $(r.re)])} />
        {!socios.length && <p className="muted">Todavía no hay retiros.</p>}
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
