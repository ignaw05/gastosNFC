'use client'
import { Area, AreaChart, Bar, CartesianGrid, ComposedChart, Line, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

export const COLORS = ['var(--c1)', 'var(--c2)', 'var(--c3)', 'var(--c4)', 'var(--c5)', 'var(--c6)']
const ars = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })
const short = new Intl.NumberFormat('es-AR', { notation: 'compact', maximumFractionDigits: 1 })
const money = (v: unknown) => ars.format(Number(v))

type TipItem = { dataKey?: string | number; name?: string; value?: number | string; color?: string; payload?: { fill?: string } }
function Tip({ active, label, payload }: { active?: boolean; label?: string | number; payload?: TipItem[] }) {
  if (!active || !payload?.length) return null
  return (
    <div className="tip">
      {label != null && label !== '' && <div className="muted">{label}</div>}
      {payload.map(p => (
        <div key={String(p.dataKey ?? p.name)} className="row">
          <span><i style={{ background: p.payload?.fill ?? p.color }} />{p.name}</span><b>{money(p.value)}</b>
        </div>
      ))}
    </div>
  )
}

// sparkline para tarjetas KPI
export function Spark({ data, color = 'var(--c1)', id }: { data: { k: string; v: number }[]; color?: string; id: string }) {
  if (data.length < 2) return null
  return (
    <div style={{ height: 56, color }}>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
          <defs><linearGradient id={id} x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="currentColor" stopOpacity={0.32} /><stop offset="100%" stopColor="currentColor" stopOpacity={0} /></linearGradient></defs>
          <XAxis dataKey="k" hide /><YAxis hide domain={['dataMin', 'dataMax']} />
          <Tooltip cursor={false} content={<Tip />} />
          <Area dataKey="v" name="Total" type="monotone" stroke="currentColor" strokeWidth={2} fill={`url(#${id})`} dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

// barras por período + línea opcional (ej: ingresos vs gastos, con ganancia)
export function Bars({ data, x, bars, line, height = 300 }: {
  data: Record<string, string | number>[]; x: string; bars: [string, string][]; line?: [string, string]; height?: number
}) {
  return (
    <div className="dots" style={{ height }}>
      <ResponsiveContainer>
        <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--line)" />
          <XAxis dataKey={x} axisLine={false} tickLine={false} tick={{ fill: 'var(--muted)', fontSize: 12 }} />
          <YAxis axisLine={false} tickLine={false} width={52} tick={{ fill: 'var(--muted)', fontSize: 12 }} tickFormatter={v => short.format(v)} />
          <Tooltip cursor={{ fill: 'var(--soft)' }} content={<Tip />} />
          {bars.map(([k, name], i) => <Bar key={k} dataKey={k} name={name} fill={COLORS[i]} radius={[4, 4, 0, 0]} maxBarSize={28} />)}
          {line && <Line dataKey={line[0]} name={line[1]} stroke="var(--c4)" strokeWidth={3} dot={false} type="monotone" />}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

// área de saldo acumulado en el tiempo
export function Trend({ data, height = 260 }: { data: { k: string; v: number }[]; height?: number }) {
  return (
    <div className="dots" style={{ height }}>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <defs><linearGradient id="trend" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="var(--c4)" stopOpacity={0.42} /><stop offset="100%" stopColor="var(--c4)" stopOpacity={0} /></linearGradient></defs>
          <XAxis dataKey="k" axisLine={false} tickLine={false} tick={{ fill: 'var(--muted)', fontSize: 12 }} minTickGap={24} />
          <YAxis axisLine={false} tickLine={false} width={52} tick={{ fill: 'var(--muted)', fontSize: 12 }} tickFormatter={v => short.format(v)} />
          <Tooltip cursor={false} content={<Tip />} />
          <Area dataKey="v" name="Saldo" type="monotone" stroke="var(--c4)" strokeWidth={3} fill="url(#trend)" dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

// dona con total al centro y leyenda con % (valores negativos se ignoran en la dona)
export function Donut({ data, center, label }: { data: { k: string; v: number }[]; center: string; label: string }) {
  const pos = data.filter(d => d.v > 0)
  const tot = pos.reduce((s, d) => s + d.v, 0)
  const rows = data.map((d, i) => ({ name: d.k, value: d.v, fill: COLORS[i % COLORS.length] }))
  return (
    <div className="donut">
      <div className="donut-chart">
        <ResponsiveContainer>
          <PieChart>
            <Pie data={rows.filter(r => r.value > 0)} dataKey="value" innerRadius="68%" outerRadius="88%" paddingAngle={pos.length > 1 ? 4 : 0} cornerRadius={4} startAngle={90} endAngle={-270} stroke="none" />
            <Tooltip content={<Tip />} wrapperStyle={{ zIndex: 2 }} />
          </PieChart>
        </ResponsiveContainer>
        <div className="donut-center"><b>{center}</b><span>{label}</span></div>
      </div>
      <ul className="legend">
        {rows.map(r => (
          <li key={r.name}><i style={{ background: r.fill }} /><span>{r.name}</span><b>{money(r.value)}</b>
            <small>{tot && r.value > 0 ? Math.round(r.value / tot * 100) : 0}%</small></li>
        ))}
      </ul>
    </div>
  )
}
