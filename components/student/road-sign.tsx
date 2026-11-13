import type { RoadSign } from '@/lib/data'

/** Kazakhstan PDD signs (ST RK 1125 / appendix to PDD RK). Drawn as correct shapes. */
export function RoadSignGraphic({ sign, size = 120 }: { sign: RoadSign; size?: number }) {
  const common = { width: size, height: size, viewBox: '0 0 100 100', role: 'img' as const, 'aria-label': sign.code }
  const code = sign.code

  // 2.1 Главная дорога — жёлтый ромб
  if (code === '2.1') {
    return (
      <svg {...common}>
        <polygon points="50,6 94,50 50,94 6,50" fill="#f5c518" stroke="#fff" strokeWidth="5" />
      </svg>
    )
  }
  // 2.4 Уступите дорогу — перевёрнутый треугольник
  if (code === '2.4') {
    return (
      <svg {...common}>
        <polygon points="6,8 94,8 50,92" fill="#fff" stroke="#d7262b" strokeWidth="8" strokeLinejoin="round" />
      </svg>
    )
  }
  // 2.5 STOP
  if (code === '2.5') {
    return (
      <svg {...common}>
        <polygon points="30,4 70,4 96,30 96,70 70,96 30,96 4,70 4,30" fill="#d7262b" stroke="#fff" strokeWidth="4" />
        <text x="50" y="59" textAnchor="middle" fontSize="22" fontWeight="800" fill="#fff" fontFamily="sans-serif">STOP</text>
      </svg>
    )
  }
  // 3.1 Въезд запрещён («кирпич»)
  if (code === '3.1') {
    return (
      <svg {...common}>
        <circle cx="50" cy="50" r="46" fill="#d7262b" />
        <rect x="18" y="40" width="64" height="20" fill="#fff" />
      </svg>
    )
  }
  // 3.2 Движение запрещено — пустой круг
  if (code === '3.2') {
    return (
      <svg {...common}>
        <circle cx="50" cy="50" r="45" fill="#fff" stroke="#d7262b" strokeWidth="9" />
      </svg>
    )
  }
  // 3.4 Грузовые запрещены
  if (code === '3.4') {
    return (
      <svg {...common}>
        <circle cx="50" cy="50" r="45" fill="#fff" stroke="#d7262b" strokeWidth="9" />
        <rect x="22" y="42" width="28" height="18" fill="#111" />
        <rect x="50" y="48" width="22" height="12" fill="#111" />
        <circle cx="32" cy="64" r="5" fill="#111" />
        <circle cx="62" cy="64" r="5" fill="#111" />
      </svg>
    )
  }
  // 3.9 Велосипеды запрещены
  if (code === '3.9') {
    return (
      <svg {...common}>
        <circle cx="50" cy="50" r="45" fill="#fff" stroke="#d7262b" strokeWidth="9" />
        <circle cx="34" cy="62" r="8" fill="none" stroke="#111" strokeWidth="2.5" />
        <circle cx="66" cy="62" r="8" fill="none" stroke="#111" strokeWidth="2.5" />
        <path d="M34 62 L46 44 L58 44 L66 62 M46 44 L42 52 L54 52" fill="none" stroke="#111" strokeWidth="2.5" strokeLinejoin="round" />
      </svg>
    )
  }
  // 3.10 Пешеходы запрещены
  if (code === '3.10') {
    return (
      <svg {...common}>
        <circle cx="50" cy="50" r="45" fill="#fff" stroke="#d7262b" strokeWidth="9" />
        <circle cx="50" cy="34" r="5" fill="#111" />
        <path d="M50 40 L50 54 M42 46 L58 46 M50 54 L42 68 M50 54 L58 68" fill="none" stroke="#111" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    )
  }
  // 3.20 Обгон запрещён
  if (code === '3.20') {
    return (
      <svg {...common}>
        <circle cx="50" cy="50" r="45" fill="#fff" stroke="#d7262b" strokeWidth="9" />
        <rect x="28" y="40" width="22" height="14" rx="2" fill="#d7262b" />
        <rect x="50" y="48" width="22" height="14" rx="2" fill="#111" />
      </svg>
    )
  }
  // 3.24 Ограничение скорости
  if (code === '3.24') {
    return (
      <svg {...common}>
        <circle cx="50" cy="50" r="45" fill="#fff" stroke="#d7262b" strokeWidth="9" />
        <text x="50" y="60" textAnchor="middle" fontSize="32" fontWeight="800" fill="#111" fontFamily="sans-serif">{sign.symbol || '50'}</text>
      </svg>
    )
  }
  // 3.27 Остановка запрещена — красный крест
  if (code === '3.27') {
    return (
      <svg {...common}>
        <circle cx="50" cy="50" r="45" fill="#fff" stroke="#d7262b" strokeWidth="9" />
        <line x1="22" y1="22" x2="78" y2="78" stroke="#d7262b" strokeWidth="8" />
        <line x1="78" y1="22" x2="22" y2="78" stroke="#d7262b" strokeWidth="8" />
      </svg>
    )
  }
  // 4.1.1 Движение прямо
  if (code === '4.1.1') {
    return (
      <svg {...common}>
        <circle cx="50" cy="50" r="46" fill="#1f5fd6" />
        <path d="M50 18 L64 38 H56 V82 H44 V38 H36 Z" fill="#fff" />
      </svg>
    )
  }
  // 4.1.2 Движение направо
  if (code === '4.1.2') {
    return (
      <svg {...common}>
        <circle cx="50" cy="50" r="46" fill="#1f5fd6" />
        <path d="M22 50 L42 36 V44 H78 V56 H42 V64 Z" fill="#fff" />
      </svg>
    )
  }
  // 4.1.3 Движение налево
  if (code === '4.1.3') {
    return (
      <svg {...common}>
        <circle cx="50" cy="50" r="46" fill="#1f5fd6" />
        <path d="M78 50 L58 36 V44 H22 V56 H58 V64 Z" fill="#fff" />
      </svg>
    )
  }
  // 4.3 Круговое движение
  if (code === '4.3') {
    return (
      <svg {...common}>
        <circle cx="50" cy="50" r="46" fill="#1f5fd6" />
        <path d="M50 22 A28 28 0 1 1 28 62" fill="none" stroke="#fff" strokeWidth="6" />
        <path d="M22 52 L28 68 L38 56" fill="#fff" />
        <path d="M50 78 A28 28 0 1 1 72 38" fill="none" stroke="#fff" strokeWidth="6" />
        <path d="M78 48 L72 32 L62 44" fill="#fff" />
      </svg>
    )
  }
  // 4.4 Движение легковых (ПДД РК)
  if (code === '4.4') {
    return (
      <svg {...common}>
        <circle cx="50" cy="50" r="46" fill="#1f5fd6" />
        <path d="M28 58 L34 46 H66 L72 58 V66 H28 Z" fill="#fff" />
        <circle cx="38" cy="66" r="4" fill="#1f5fd6" />
        <circle cx="62" cy="66" r="4" fill="#1f5fd6" />
      </svg>
    )
  }
  // 4.5 Велосипедная дорожка (ПДД РК)
  if (code === '4.5') {
    return (
      <svg {...common}>
        <circle cx="50" cy="50" r="46" fill="#1f5fd6" />
        <circle cx="34" cy="60" r="8" fill="none" stroke="#fff" strokeWidth="2.5" />
        <circle cx="66" cy="60" r="8" fill="none" stroke="#fff" strokeWidth="2.5" />
        <path d="M34 60 L46 42 L58 42 L66 60 M46 42 L42 50 L54 50" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinejoin="round" />
      </svg>
    )
  }
  // 4.6 Пешеходная дорожка (ПДД РК)
  if (code === '4.6') {
    return (
      <svg {...common}>
        <circle cx="50" cy="50" r="46" fill="#1f5fd6" />
        <circle cx="50" cy="32" r="5" fill="#fff" />
        <path d="M50 38 L50 54 M40 46 L60 46 M50 54 L40 70 M50 54 L60 70" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    )
  }

  // Fallback
  return (
    <svg {...common}>
      <circle cx="50" cy="50" r="40" fill="#eee" stroke="#999" strokeWidth="2" />
      <text x="50" y="56" textAnchor="middle" fontSize="14" fill="#333">{code}</text>
    </svg>
  )
}
