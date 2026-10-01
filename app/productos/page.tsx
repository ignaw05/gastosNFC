import { save } from '@/app/actions'
import { sql, params, $, num } from '@/lib/db'
import { Sel, In, Del, Grid } from '@/lib/ui'

export default async function Productos() {
  const [p, prods, items] = await Promise.all([
    params(),
    sql`select * from costo_producto order by tipo, nombre`,
    sql`select i.*, c.costo from producto_items i
        left join costo_insumo c on c.tipo = i.gasto_tipo and c.nombre = i.gasto_nombre order by i.id`,
  ])

  return (
    <>
      <h2>Productos</h2>
      <article>
        <form action={save.bind(null, 'productos')}>
          <div className="grid">
            <Sel label="Tipo" name="tipo" opts={p.producto_tipo} />
            <Sel label="Nombre" name="nombre" opts={p.producto_nombre} />
          </div>
          <button>Crear producto</button>
        </form>
      </article>

      {prods.map(pr => (
        <article key={pr.id}>
          <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong>{pr.tipo} · {pr.nombre} — costo unitario {$(pr.costo)}</strong>
            <Del table="productos" id={pr.id} />
          </header>
          <Grid head={['Insumo', 'Cantidad', 'Costo unit.', 'Subtotal', '']}
            rows={items.filter(i => i.producto_id === pr.id).map(i => [
              `${i.gasto_tipo} · ${i.gasto_nombre}${i.costo == null ? ' ⚠️ sin gastos' : ''}`,
              num(i.cantidad), $(i.costo), $(Number(i.cantidad) * Number(i.costo ?? 0)),
              <Del key="d" table="producto_items" id={i.id} />])} />
          <form action={save.bind(null, 'producto_items')}>
            <input type="hidden" name="producto_id" value={pr.id} />
            <div className="grid">
              <Sel label="Tipo insumo" name="gasto_tipo" opts={p.gasto_tipo} />
              <Sel label="Nombre insumo" name="gasto_nombre" opts={p.gasto_nombre} />
              <In label="Cantidad por producto" name="cantidad" type="number" step="any" min="0.0001" defaultValue={1} />
            </div>
            <button className="secondary">Agregar insumo</button>
          </form>
        </article>
      ))}
    </>
  )
}
