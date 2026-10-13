import type { RoadSign } from '@/lib/data'

export function RoadSignGraphic({ sign, size = 120 }: { sign: RoadSign; size?: number }) {
  const common = { width: size, height: size, viewBox: '0 0 100 100', role: 'img' as const, 'aria-label': sign.code }
  switch (sign.shape) {
    case 'stop':
      return (
        <svg {...common}>
          <polygon points="30,4 70,4 96,30 96,70 70,96 30,96 4,70 4,30" fill="#d7262b" stroke="#fff" strokeWidth="4" />
          <text x="50" y="59" textAnchor="middle" fontSize="24" fontWeight="800" fill="#fff" fontFamily="sans-serif">
            STOP
          </text>
        </svg>
      )
    case 'yield':
      return (
        <svg {...common}>
          <polygon points="6,10 94,10 50,92" fill="#fff" stroke="#d7262b" strokeWidth="10" strokeLinejoin="round" />
        </svg>
      )
    case 'warning':
      return (
        <svg {...common}>
          <polygon points="50,6 96,90 4,90" fill="#fff" stroke="#d7262b" strokeWidth="9" strokeLinejoin="round" />
          {sign.symbol === '●' ? (
            <>
              <rect x="42" y="38" width="16" height="42" rx="4" fill="#111" />
              <circle cx="50" cy="46" r="4" fill="#e11" />
              <circle cx="50" cy="59" r="4" fill="#fc0" />
              <circle cx="50" cy="72" r="4" fill="#2a2" />
            </>
          ) : (
            <text x="50" y="80" textAnchor="middle" fontSize="44" fontWeight="800" fill="#111" fontFamily="sans-serif">
              {sign.symbol}
            </text>
          )}
        </svg>
      )
    case 'prohibit':
      return (
        <svg {...common}>
          <circle cx="50" cy="50" r="45" fill={sign.symbol === '—' ? '#d7262b' : '#fff'} stroke="#d7262b" strokeWidth="9" />
          {sign.symbol === '—' ? (
            <rect x="20" y="42" width="60" height="16" fill="#fff" />
          ) : (
            <text x="50" y="62" textAnchor="middle" fontSize="36" fontWeight="800" fill="#111" fontFamily="sans-serif">
              {sign.symbol}
            </text>
          )}
        </svg>
      )
    case 'mandatory':
      return (
        <svg {...common}>
          <circle cx="50" cy="50" r="46" fill="#1f5fd6" stroke="#fff" strokeWidth="3" />
          <path d="M50 20 L68 42 H56 V80 H44 V42 H32 Z" fill="#fff" />
        </svg>
      )
    case 'info':
      return (
        <svg {...common}>
          <rect x="6" y="6" width="88" height="88" rx="10" fill="#1f5fd6" stroke="#fff" strokeWidth="3" />
          <text x="50" y="72" textAnchor="middle" fontSize="60" fontWeight="800" fill="#fff" fontFamily="sans-serif">
            {sign.symbol}
          </text>
        </svg>
      )
  }
}
