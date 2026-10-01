import { save, renameParam } from '@/app/actions'
import { sql, KINDS, type Kind } from '@/lib/db'
import { Head, Del } from '@/lib/ui'

export default async function Params() {
  const rows = await sql<{ id: number; kind: Kind; value: string }[]>`select * from params order by value`
  return (
    <>
      <Head eyebrow="Configuración" title="Parámetros" />
      <p className="muted" style={{ margin: 0 }}>Renombrar un valor actualiza también los gastos, ingresos y productos que lo usan.</p>
      <div className="grid" style={{ ['--cols' as string]: 3 }}>
        {(Object.keys(KINDS) as Kind[]).map(k => (
          <section key={k} className="card">
            <h2>{KINDS[k]}</h2>
            {rows.filter(r => r.kind === k).map(r => (
              <div key={r.id} className="row" style={{ gap: 8 }}>
                <form action={renameParam.bind(null, r.id)} style={{ display: 'flex', gap: 8, flex: 1, margin: 0 }}>
                  <input name="value" defaultValue={r.value} required aria-label={`Renombrar ${r.value}`} />
                  <button className="ghost" aria-label={`Guardar ${r.value}`}>✓</button>
                </form>
                <Del table="params" id={r.id} label={`Eliminar ${r.value}`} />
              </div>
            ))}
            <form action={save.bind(null, 'params')} style={{ display: 'flex', gap: 8, margin: 0 }}>
              <input type="hidden" name="kind" value={k} />
              <input name="value" required placeholder="Nuevo…" aria-label={`Nuevo valor en ${KINDS[k]}`} />
              <button aria-label="Agregar">+</button>
            </form>
          </section>
        ))}
      </div>
    </>
  )
}
