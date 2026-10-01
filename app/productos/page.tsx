import { save, addStock, del } from '@/app/actions'
import { sql, params, $, num } from '@/lib/db'
import { Head, Sel, In, Del, Grid } from '@/lib/ui'

export default async function Productos() {
  const [p, prods, items, unidades] = await Promise.all([
    params(),
    sql`select cp.*, coalesce(v.u, 0) vendidas, coalesce(v.m, 0) facturado,
          (select count(*) from unidades u where u.producto_id = cp.id)::int armadas
        from costo_producto cp
        left join (select tipo, nombre, sum(unidades) u, sum(monto) m from ingresos group by 1, 2) v using (tipo, nombre)
        order by tipo, nombre`,
    sql`select i.*, c.costo from producto_items i
        left join costo_insumo c on c.tipo = i.gasto_tipo and c.nombre = i.gasto_nombre order by i.id`,
    sql`select id, producto_id, codigo, ingreso_id from unidades order by codigo nulls last, id`,
  ])

  return (
    <>
      <Head eyebrow="Costeo y stock" title="Productos">
        <form action={save.bind(null, 'productos')} className="fields" style={{ gridTemplateColumns: 'repeat(3, auto)' }}>
          <Sel label="Tipo" name="tipo" opts={p.producto_tipo} />
          <Sel label="Nombre" name="nombre" opts={p.producto_nombre} />
          <button>Crear producto</button>
        </form>
      </Head>

      <div className="grid stack">
        {prods.map(pr => {
          const precio = Number(pr.vendidas) ? Number(pr.facturado) / Number(pr.vendidas) : 0
          const stock = pr.armadas - Number(pr.vendidas)
          const us = unidades.filter(u => u.producto_id === pr.id)
          const conCodigo = us.filter(u => u.codigo)
          const libreSinCodigo = us.find(u => !u.codigo && !u.ingreso_id)
          return (
            <article key={pr.id} className="card">
              <div className="row">
                <div><div className="eyebrow">{pr.tipo}</div><h3>{pr.nombre}</h3></div>
                <Del table="productos" id={pr.id} label="Eliminar producto" />
              </div>
              <div className="stats">
                <div><small>Costo unit.</small><b>{$(pr.costo)}</b></div>
                <div><small>Precio prom.</small><b className="in">{precio ? $(precio) : '—'}</b></div>
                <div><small>Margen</small><b>{precio ? `${Math.round((1 - Number(pr.costo) / precio) * 100)}%` : '—'}</b></div>
                <div><small>Stock</small><b className={stock < 0 ? 'out' : undefined}>{stock}</b></div>
              </div>

              <Grid head={['Insumo', '#Cant.', '$Unit.', '$Subtotal', '']}
                rows={items.filter(i => i.producto_id === pr.id).map(i => [
                  <span key="n"><strong>{i.gasto_nombre}</strong> <span className="muted">· {i.gasto_tipo}</span>
                    {i.costo == null && <> <span className="tag warn">sin compras</span></>}</span>,
                  num(i.cantidad), i.costo == null ? '—' : $(i.costo), $(Number(i.cantidad) * Number(i.costo ?? 0)),
                  <Del key="d" table="producto_items" id={i.id} label="Quitar insumo" />])} />
              <details>
                <summary>+ Agregar insumo</summary>
                <form action={save.bind(null, 'producto_items')} className="fields" style={{ marginTop: 12 }}>
                  <input type="hidden" name="producto_id" value={pr.id} />
                  <Sel label="Tipo insumo" name="gasto_tipo" opts={p.gasto_tipo} />
                  <Sel label="Nombre insumo" name="gasto_nombre" opts={p.gasto_nombre} />
                  <In label="Cantidad por producto" name="cantidad" type="number" step="any" min="0.0001" defaultValue={1} />
                  <button className="ghost">Agregar</button>
                </form>
              </details>

              <div className="row"><h2>Stock</h2><span className="muted">{pr.armadas} armadas · {num(pr.vendidas)} vendidas</span></div>
              {conCodigo.length > 0 && (
                <div className="tags">
                  {conCodigo.map(u => (
                    <span key={u.id} className={`tag${u.ingreso_id ? ' sold' : ''}`} title={u.ingreso_id ? 'Vendida' : 'Disponible'}>
                      {u.codigo}{!u.ingreso_id && <Del table="unidades" id={u.id} label={`Quitar ${u.codigo}`} />}
                    </span>
                  ))}
                </div>
              )}
              <form action={addStock} className="fields">
                <input type="hidden" name="producto_id" value={pr.id} />
                <label>Cantidad<input name="cantidad" type="number" min="1" max="1000" defaultValue={1} /></label>
                <label style={{ gridColumn: 'span 2' }}>Códigos (opcional, uno por línea; reemplaza la cantidad)
                  <textarea name="codigos" rows={2} placeholder={'NFC-001\nNFC-002'} /></label>
                <div className="actions" style={{ justifyContent: 'flex-start' }}>
                  <button className="ghost">+ Sumar stock</button>
                </div>
              </form>
              {libreSinCodigo && (
                <form action={del.bind(null, 'unidades', libreSinCodigo.id)}>
                  <button className="ghost">− Quitar 1 sin código</button>
                </form>
              )}
            </article>
          )
        })}
      </div>
    </>
  )
}
