import { del, type Table } from '@/app/actions'

export function Head({ eyebrow, title, children }: { eyebrow: string; title: string; children?: React.ReactNode }) {
  return (
    <header className="head">
      <div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1></div>
      {children}
    </header>
  )
}

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

// radios con pinta de botones: [valor, etiqueta]
export function Chips({ name, opts, value, label }: { name: string; opts: [string, string][]; value?: string; label: string }) {
  return (
    <fieldset className="chips full">
      <legend>{label}</legend>
      {opts.map(([v, l], i) => (
        <label key={v}><input type="radio" name={name} value={v} defaultChecked={value ? v === value : i === 0} required /><span>{l}</span></label>
      ))}
    </fieldset>
  )
}

export function In({ label, className, ...p }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return <label className={className}>{label}<input required {...p} /></label>
}

export function Del({ table, id, label = 'Eliminar' }: { table: Table; id: number; label?: string }) {
  return (
    <form action={del.bind(null, table, id)}>
      <button className="icon" aria-label={label} title={label}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" /></svg>
      </button>
    </form>
  )
}

export function Kpi({ label, value, sub, className = '', dark }: { label: string; value: string; sub?: string; className?: string; dark?: boolean }) {
  return (
    <div className={`card kpi${dark ? ' dark' : ''}`}>
      <small>{label}</small>
      <b className={className}>{value}</b>
      {sub && <small className="muted">{sub}</small>}
    </div>
  )
}

// columnas que empiezan con '$' o '#' se alinean como números
export function Grid({ head, rows }: { head: string[]; rows: React.ReactNode[][] }) {
  const isNum = head.map(h => /^[$#]/.test(h))
  return (
    <div className="scroll">
      <table>
        <thead><tr>{head.map((h, j) => <th key={j} className={isNum[j] ? 'num' : undefined}>{h.replace(/^[$#]/, '')}</th>)}</tr></thead>
        <tbody>{rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} className={isNum[j] ? 'num' : undefined}>{c}</td>)}</tr>)}</tbody>
      </table>
    </div>
  )
}
