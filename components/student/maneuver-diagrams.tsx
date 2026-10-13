const stroke = 'var(--color-primary)'

export function ParallelDiagram() {
  return (
    <svg viewBox="0 0 200 110" className="h-auto w-full" aria-hidden="true">
      <rect x="0" y="0" width="200" height="110" rx="8" fill="var(--color-muted)" />
      <line x1="10" y1="40" x2="190" y2="40" stroke="#fff" strokeWidth="2" strokeDasharray="8 6" />
      <rect x="20" y="62" width="40" height="22" rx="4" fill="#94a3b8" />
      <rect x="140" y="62" width="40" height="22" rx="4" fill="#94a3b8" />
      <rect x="68" y="60" width="64" height="28" rx="3" fill="none" stroke="#fff" strokeWidth="2" strokeDasharray="4 3" />
      <rect x="132" y="14" width="40" height="22" rx="4" fill={stroke} />
      <path d="M140 38 C 130 60, 100 52, 92 72" fill="none" stroke={stroke} strokeWidth="2.5" markerEnd="url(#a1)" />
      <defs>
        <marker id="a1" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill={stroke} />
        </marker>
      </defs>
    </svg>
  )
}

export function HillDiagram() {
  return (
    <svg viewBox="0 0 200 110" className="h-auto w-full" aria-hidden="true">
      <rect x="0" y="0" width="200" height="110" rx="8" fill="var(--color-muted)" />
      <path d="M10 90 L70 90 L120 40 L150 40 L190 90" fill="#cbd5e1" stroke="#94a3b8" strokeWidth="2" />
      <line x1="128" y1="34" x2="128" y2="46" stroke="#ef4444" strokeWidth="3" />
      <g transform="translate(92 54) rotate(-45)">
        <rect x="-18" y="-10" width="36" height="18" rx="4" fill={stroke} />
      </g>
      <path d="M40 84 L66 84" stroke={stroke} strokeWidth="2.5" markerEnd="url(#a2)" />
      <defs>
        <marker id="a2" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill={stroke} />
        </marker>
      </defs>
    </svg>
  )
}

export function SlalomDiagram() {
  const cones = [40, 80, 120, 160]
  return (
    <svg viewBox="0 0 200 110" className="h-auto w-full" aria-hidden="true">
      <rect x="0" y="0" width="200" height="110" rx="8" fill="var(--color-muted)" />
      {cones.map((x) => (
        <polygon key={x} points={`${x},48 ${x - 6},62 ${x + 6},62`} fill="#f97316" />
      ))}
      <path
        d="M10 55 C 25 25, 35 25, 40 30 S 60 85, 80 80 S 100 25, 120 30 S 140 85, 160 80 S 185 40, 195 55"
        fill="none"
        stroke={stroke}
        strokeWidth="2.5"
        strokeDasharray="5 4"
      />
    </svg>
  )
}
