import Link from 'next/link'
import { save } from '@/app/actions'
import { sql, params, $, fecha } from '@/lib/db'
import { Head, Sel, In, Del, Grid, Kpi, Chips } from '@/lib/ui'

const ORIGEN: Record<string, string> = { ingreso: 'Venta', comision: 'Comisión', gasto: 'Gasto', transferencia: 'Transferencia', retiro: 'Retiro ganancia', reintegro: 'Devolución gastos', aporte: 'Aporte' }

export default async function Caja({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const { m } = await searchParams
  const [p, saldos, socios, [gan], movs] = await Promise.all([
    params(),
    sql`select medio, sum(monto) s from caja_mov group by 1 order by s desc`,
    // puso = gastos pagados de su bolsillo + aportes; devuelto = reintegros; retiro = ganancia que se llevó
    sql`with g as (select pagador persona, sum(monto) bolsillo from gastos where medio is null group by 1),
             c as (select persona, sum(monto) filter (where tipo = 'aporte') ap, sum(monto) filter (where tipo = 'reintegro') dev,
                          sum(monto) filter (where tipo = 'retiro') re from caja where persona is not null group by 1)
        select persona, coalesce(bolsillo, 0) + coalesce(ap, 0) puso, coalesce(dev, 0) dev, coalesce(re, 0) re
        from g full join c using (persona) order by puso desc`,
    // ganancia de caja: todo lo vendido − comisiones − todo lo gastado (incluye stock sin vender)
    sql`select (select coalesce(sum(monto - comision), 0) from ingresos) - (select coalesce(sum(monto), 0) from gastos) g`,
    // saldo acumulado (del medio filtrado o del total) en orden cronológico
    sql`select *, sum(monto) over (order by fecha, origen, id, monto rows unbounded preceding) saldo
        from caja_mov where ${m ? sql`medio = ${m}` : sql`true`}
        order by fecha desc, origen desc, id desc, monto desc`,
  ])
  const total = saldos.reduce((s, r) => s + Number(r.s), 0)
  const sum = (k: string) => socios.reduce((s, r) => s + Number(r[k]), 0)
  const retirado = sum('re'), debe = sum('puso') - sum('dev')
  // medios configurados sin movimientos también aparecen, en $0
  const medios = [...saldos, ...p.metodo_pago.filter(x => !saldos.some(r => r.medio === x)).map(medio => ({ medio, s: 0 }))]
  const hoy = fecha(new Date())
  const tab = (v: string | undefined, l: string) =>
    <Link key={l} href={v ? `/caja?m=${encodeURIComponent(v)}` : '/caja'} aria-current={m === v ? 'page' : undefined} scroll={false}>{l}</Link>

  return (
    <>
      <Head eyebrow="Plata" title="Caja" />

      <div className="grid" style={{ ['--min' as string]: '160px' }}>
        <Kpi label="En caja" value={$(total)} sub="= a devolver + ganancia sin retirar" dark />
        <Kpi label="A devolver a socios" value={$(debe)} sub="gastos de su bolsillo + aportes − devuelto" />
        <Kpi label="Ganancia sin retirar" value={$(Number(gan.g) - retirado)} className={Number(gan.g) - retirado < 0 ? 'out' : 'in'} sub={`ganancia total ${$(gan.g)}`} />
        <Kpi label="Ganancia retirada" value={$(retirado)} />
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
            <Chips label="Para qué" name="tipo" opts={[['reintegro', 'Devolverme gastos'], ['retiro', 'Ganancia']]} />
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
        <Grid head={['Socio', '$Puso', '$Le devolvieron', '$Le deben', '$Ganancia retirada']}
          rows={socios.map(r => [<strong key="p">{r.persona ?? '—'}</strong>, $(r.puso), $(r.dev), <strong key="d">{$(Number(r.puso) - Number(r.dev))}</strong>, $(r.re)])} />
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
            ['transferencia', 'retiro', 'reintegro', 'aporte'].includes(r.origen) ? <Del key="x" table="caja" id={r.id} /> : null])} />
      </section>
    </>
  )
}
