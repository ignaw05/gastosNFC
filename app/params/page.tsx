import { save } from '@/app/actions'
import { sql, KINDS, type Kind } from '@/lib/db'
import { Del } from '@/lib/ui'

export default async function Params() {
  const rows = await sql<{ id: number; kind: Kind; value: string }[]>`select * from params order by value`
  return (
    <>
      <h2>Parámetros</h2>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
        {(Object.keys(KINDS) as Kind[]).map(k => (
          <article key={k}>
            <header><strong>{KINDS[k]}</strong></header>
            {rows.filter(r => r.kind === k).map(r => (
              <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between' }}>{r.value}<Del table="params" id={r.id} /></div>
            ))}
            <form action={save.bind(null, 'params')} style={{ marginTop: '1rem' }}>
              <input type="hidden" name="kind" value={k} />
              <fieldset role="group"><input name="value" required placeholder="Nuevo…" /><button>+</button></fieldset>
            </form>
          </article>
        ))}
      </div>
    </>
  )
}
