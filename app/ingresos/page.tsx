import Link from 'next/link'
import { save } from '@/app/actions'
import { sql, params, $, num, fecha } from '@/lib/db'
import { Head, Sel, In, Del, Grid, Chips } from '@/lib/ui'

const resumen = (by: string) => sql`
  select ${sql(by)} k, sum(unidades) u, sum(monto) m, sum(comision) c, sum(costo) co, sum(ganancia) g
  from ingresos_ganancia group by 1 order by g desc`

export default async function Ingresos({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  const { edit } = await searchParams
  const [p, rows, prods, codigos, porProd, porVend, porMetodo] = await Promise.all([
    params(),
    sql`select * from ingresos_ganancia order by fecha desc, id desc`,
    sql`select tipo, nombre from productos order by tipo, nombre`,
    sql`select ingreso_id, string_agg(codigo, ' ' order by codigo) cs from unidades where ingreso_id is not null group by 1`,
    sql`select tipo || ' · ' || nombre k, sum(unidades) u, sum(monto) m, sum(comision) c, sum(costo) co, sum(ganancia) g
        from ingresos_ganancia group by 1 order by g desc`,
    resumen('vendedor'),
    resumen('metodo_pago'),
  ])
  const e = rows.find(r => String(r.id) === edit)
  const cods: Record<string, string> = Object.fromEntries(codigos.map(c => [c.ingreso_id, c.cs]))
  const prodOpts: [string, string][] = prods.map(x => [JSON.stringify([x.tipo, x.nombre]), `${x.tipo} · ${x.nombre}`])
  const head = ['', '#Unidades', '$Monto', '$Comisión', '$Costo', '$Ganancia']
  const fmt = (rs: typeof porProd) => rs.map(r => [<strong key="k">{r.k}</strong>, num(r.u), $(r.m), $(r.c), $(r.co), <strong key="g">{$(r.g)}</strong>])

  return (
    <>
      <Head eyebrow="Ventas" title="Ingresos" />
      <form action={save.bind(null, 'ingresos')} key={edit} className="card">
        <h2>{e ? 'Editar ingreso' : 'Nuevo ingreso'}</h2>
        {e && <input type="hidden" name="id" value={e.id} />}
        {prodOpts.length
          ? <div className="fields">
              <Chips label="Producto" name="producto" opts={prodOpts} value={e && JSON.stringify([e.tipo, e.nombre])} />
              <In label="Unidades" name="unidades" type="number" step="any" min="0.0001" defaultValue={e?.unidades ?? 1} />
              <In label="Monto total" name="monto" type="number" step="0.01" min="0" defaultValue={e?.monto} />
              <In label="Fecha" name="fecha" type="date" defaultValue={e ? fecha(e.fecha) : fecha(new Date())} />
              <Chips label="Método de pago" name="metodo_pago" opts={p.metodo_pago.map(m => [m, m])} value={e?.metodo_pago} />
              <Sel label="Vendedor" name="vendedor" opts={p.vendedor} value={e?.vendedor} />
              <In label="Comisión $" name="comision" type="number" step="0.01" min="0" defaultValue={e?.comision ?? 0} />
              <label className="full">Códigos vendidos (opcional, separados por espacio o coma)
                <input name="codigos" defaultValue={e ? cods[e.id] : ''} placeholder="NFC-001 NFC-002" />
              </label>
              <div className="actions" style={{ justifyContent: 'flex-start' }}>
                <button>{e ? 'Guardar' : 'Guardar ingreso'}</button>
                {e && <Link href="/ingresos" className="btn ghost">Cancelar</Link>}
              </div>
            </div>
          : <p className="muted">Primero creá un producto en <Link href="/productos">Productos</Link>.</p>}
      </form>

      <section className="card"><h2>Por producto</h2><Grid head={head} rows={fmt(porProd)} /></section>
      <div className="grid stack">
        <section className="card"><h2>Por vendedor</h2><Grid head={head} rows={fmt(porVend)} /></section>
        <section className="card"><h2>Por método de pago</h2><Grid head={head} rows={fmt(porMetodo)} /></section>
      </div>

      <section className="card">
        <h2>Movimientos</h2>
        <Grid head={['Fecha', 'Producto', '#Unid.', '$Monto', 'Pago', 'Vendedor', '$Comisión', '$Costo', '$Ganancia', '']}
          rows={rows.map(r => [<span key="f" className="num muted">{fecha(r.fecha)}</span>,
            <span key="p"><strong>{r.tipo} · {r.nombre}</strong>{r.sin_producto && <> <span className="tag warn">sin producto</span></>}
              {cods[r.id] && <div className="tags" style={{ marginTop: 4 }}>{cods[r.id].split(' ').map(c => <span key={c} className="tag">{c}</span>)}</div>}</span>,
            num(r.unidades), <span key="m" className="in">{$(r.monto)}</span>, r.metodo_pago, r.vendedor, $(r.comision), $(r.costo), <strong key="g">{$(r.ganancia)}</strong>,
            <div key="a" className="actions"><Link href={`/ingresos?edit=${r.id}`}>Editar</Link><Del table="ingresos" id={r.id} /></div>])} />
      </section>
    </>
  )
}
