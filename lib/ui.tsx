import { del, type Table } from '@/app/actions'

export function Sel({ name, opts, value, label }: { name: string; opts: string[]; value?: string; label: string }) {
  const all = [...new Set([value, ...opts].filter(Boolean) as string[])]
  return (
    <label>{label}
      <select name={name} defaultValue={value ?? ''} required>
        <option value="" disabled>—</option>
        {all.map(o => <option key={o}>{o}</option>)}
      </select>
    </label>
  )
}

export function In({ label, ...p }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return <label>{label}<input required {...p} /></label>
}

export function Del({ table, id }: { table: Table; id: number }) {
  return <form action={del.bind(null, table, id)} style={{ margin: 0 }}><button className="outline secondary" style={{ padding: '0 .5rem' }}>✕</button></form>
}

// filas: arrays de celdas ya formateadas
export function Grid({ head, rows }: { head: string[]; rows: React.ReactNode[][] }) {
  return (
    <div className="overflow-auto">
      <table className="striped">
        <thead><tr>{head.map(h => <th key={h}>{h}</th>)}</tr></thead>
        <tbody>{rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>)}</tbody>
      </table>
    </div>
  )
}
