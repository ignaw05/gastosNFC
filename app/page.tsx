import { sql, $ } from '@/lib/db'
import { Grid } from '@/lib/ui'

export default async function General() {
  const meses = await sql`
    with g as (select to_char(fecha, 'YYYY-MM') mes, sum(monto) gastos from gastos group by 1),
         i as (select to_char(fecha, 'YYYY-MM') mes, sum(monto) ingresos, sum(comision) comisiones, sum(ganancia) ganancia
               from ingresos_ganancia group by 1)
    select mes, coalesce(ingresos, 0) ingresos, coalesce(comisiones, 0) comisiones, coalesce(gastos, 0) gastos,
           coalesce(ganancia, 0) ganancia, coalesce(ingresos, 0) - coalesce(comisiones, 0) - coalesce(gastos, 0) caja
    from g full join i using (mes) order by mes desc`
  const t = (k: string) => meses.reduce((s, r) => s + Number(r[k]), 0)

  return (
    <>
      <h2>General</h2>
      <div className="grid">
        {[['Ingresos', 'ingresos'], ['Gastos', 'gastos'], ['Comisiones', 'comisiones'], ['Ganancia s/ventas', 'ganancia'], ['Caja', 'caja']]
          .map(([l, k]) => <article key={k}><small>{l}</small><h3 style={{ margin: 0 }}>{$(t(k))}</h3></article>)}
      </div>
      <small>Ganancia s/ventas = ingresos − comisiones − costo de lo vendido. Caja = ingresos − comisiones − todo lo gastado (incluye stock sin vender).</small>
      <h3>Por mes</h3>
      <Grid head={['Mes', 'Ingresos', 'Comisiones', 'Gastos', 'Ganancia s/ventas', 'Caja']}
        rows={meses.map(r => [r.mes, $(r.ingresos), $(r.comisiones), $(r.gastos), $(r.ganancia), $(r.caja)])} />
    </>
  )
}
