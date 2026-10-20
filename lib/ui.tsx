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

// icon: path SVG (24x24) para el badge; children: gráfico chico debajo del valor
export function Kpi({ label, value, sub, className = '', dark, icon, children }: { label: string; value: string; sub?: React.ReactNode; className?: string; dark?: boolean; icon?: string; children?: React.ReactNode }) {
  return (
    <div className={`card kpi${dark ? ' dark' : ''}`}>
      <div className="top"><small>{label}</small>{icon && <span className="badge"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={icon} /></svg></span>}</div>
      <div><b className={className}>{value}</b>{sub && <small className="muted">{sub}</small>}</div>
      {children}
    </div>
  )
}

export const ICON = {
  in: 'M12 19V5M5 12l7-7 7 7',
  out: 'M12 5v14M19 12l-7 7-7-7',
  trend: 'M3 17l6-6 4 4 8-8M15 7h6v6',
  wallet: 'M3 7h18v13H3zM3 7l3-4h12l3 4M16 13h2',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0',
  box: 'M21 8l-9-5-9 5 9 5 9-5zM3 8v8l9 5 9-5V8',
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

// filtro por mes o rango (form GET nativo); "Todo" limpia
export function Filtro({ path, r }: { path: string; r: { mes?: string; desde?: string; hasta?: string; activo: boolean } }) {
  return (
    <form className="card inline-form" action={path}>
      <label>Mes<input type="month" name="mes" defaultValue={r.mes} /></label>
      <label>Desde<input type="date" name="desde" defaultValue={r.mes ? undefined : r.desde} /></label>
      <label>Hasta<input type="date" name="hasta" defaultValue={r.mes ? undefined : r.hasta} /></label>
      <button>Filtrar</button>
      {r.activo && <a href={path} className="btn ghost">Todo</a>}
    </form>
  )
}
