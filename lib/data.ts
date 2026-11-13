import type { L } from './i18n'

export type Category = 'A' | 'A1' | 'B' | 'B1' | 'C' | 'C1' | 'E' | 'E1'
export const CATEGORIES: Category[] = ['A', 'A1', 'B', 'B1', 'C', 'C1', 'E', 'E1']

export type DocKey = 'idFront' | 'idBack' | 'psycho' | 'narco'
export const DOC_KEYS: DocKey[] = ['idFront', 'idBack', 'psycho', 'narco']
export type DocFile = { name: string; url: string }
export type DocStatus = 'draft' | 'pending' | 'approved' | 'rejected'

export type Student = {
  id: string
  name: string
  phone: string
  category: Category
  docs: Record<DocKey, DocFile | null>
  status: DocStatus
  readyDate: string | null
  submittedAt: string | null
  updatedAt?: string
  archived?: boolean
  archivedAt?: string | null
}

export type Branch = { id: string; city: L; address: L; link: string }

/** Учебный маршрут автошколы (редактируется в админке) */
export type SchoolRoute = {
  id: string
  name: L
  steps: L[]
}

export type School = {
  name: string
  about: L
  hours: L
  phones: string[]
  phoneEnrollment: string
  phoneSupport: string
  branches: Branch[]
  instagram: string
  website: string
  /** Адрес спец. отдела для экзамена */
  examAddress?: L
  /** Наши учебные маршруты */
  routes?: SchoolRoute[]
}

export type TheoryLesson = { id: string; title: L; body: L; imageUrl?: string | null }
export type TheoryTopic = { id: string; title: L; lessons: number; done: number; content?: TheoryLesson[] }
export type Question = { id: string; q: L; options: L[]; correct: number; explain: L; imageUrl?: string | null }
export type Instructor = { id: string; name: string; phone: string; car: string; categories: Category[]; slots: string[] }
export type Review = { id: string; author: string; rating: number; text: string; date: string; visible: boolean }
export type Message = {
  id: string
  thread: string
  fromMe: boolean
  text: string
  time: string
  studentId?: string
  authorName?: string
}

export type Profile = { id: string; full_name: string; phone: string }
export type Notice = { id: string; kind: 'lesson' | 'docs' | 'info' | 'announce'; title: L; body: L; time: string; read: boolean; studentId?: string; dismissedBy?: string[] }
export type Booking = {
  id: string
  date: string
  time: string
  instructorId: string
  studentId?: string
  studentName?: string
  studentPhone?: string
}
export type TestResult = { id: string; date: string; score: number; total: number; studentId?: string; studentName?: string }

export type SignShape = 'prohibit' | 'warning' | 'mandatory' | 'info' | 'stop' | 'yield' | 'priority'
export type RoadSign = {
  id: string
  code: string
  shape: SignShape
  symbol: string
  name: L
  meaning: L
  imageUrl?: string | null
}

export const seedStudents: Student[] = []

export const DEFAULT_EXAM_ADDRESS: L = {
  ru: 'Специализированный отдел г. Туркестан по обслуживанию населения, Қазыбек би улица, 9/9, с. 30 лет Казахстана, район Сауран, Туркестанская область, 161223',
  kk: 'Түркістан қ. халыққа қызмет көрсетудің мамандандырылған бөлімі, Қазыбек би көшесі, 9/9, Қазақстанның 30 жылдығы а., Сауран ауданы, Түркістан облысы, 161223',
}

export const seedSchoolRoutes: SchoolRoute[] = [
  {
    id: 'route-1',
    name: { ru: 'Маршрут №1 — центр', kk: '№1 бағыт — орталық' },
    steps: [
      { ru: 'Старт у автошколы', kk: 'Автомектептен старт' },
      { ru: 'Движение по центру города', kk: 'Қала орталығы бойынша жүру' },
      { ru: 'Круговой маршрут и возврат', kk: 'Шеңберлі бағыт және қайту' },
    ],
  },
  {
    id: 'route-2',
    name: { ru: 'Маршрут №2 — жилой район', kk: '№2 бағыт — тұрғын аудан' },
    steps: [
      { ru: 'Старт у автошколы', kk: 'Автомектептен старт' },
      { ru: 'Выезд в жилой сектор', kk: 'Тұрғын секторға шығу' },
      { ru: 'Перекрёстки и пешеходные зоны', kk: 'Қиылыстар мен жаяу аймақтар' },
      { ru: 'Возврат к автошколе', kk: 'Автомектепке қайту' },
    ],
  },
]

export const seedSchool: School = {
  name: 'AvtoEmir',
  about: {
    ru: 'Автошкола AvtoEmir — обучение вождению категорий A, A1, B, B1, C, C1, E, E1 в Туркестане и Карнаке.',
    kk: 'AvtoEmir автомектебі — Түркістан мен Қарнақта A, A1, B, B1, C, C1, E, E1 санаттары бойынша жүргізуге оқыту.',
  },
  hours: { ru: 'Пн–Сб 9:00–18:00', kk: 'Дс–Сб 9:00–18:00' },
  phones: ['+7 701 000 00 00'],
  phoneEnrollment: '+7 701 111 11 11',
  phoneSupport: '+7 701 222 22 22',
  instagram: 'https://www.instagram.com/avtoshkola_turkestan_avtoemir',
  website: '',
  examAddress: DEFAULT_EXAM_ADDRESS,
  routes: seedSchoolRoutes,
  branches: [
    {
      id: 'turkestan',
      city: { ru: 'г. Туркестан', kk: 'Түркістан қ.' },
      address: { ru: 'пр. Тауке Хана, 287', kk: 'Тәуке хан даңғылы, 287' },
      link: 'https://2gis.kz/turkestan/geo/70000001104980724',
    },
    {
      id: 'karnak',
      city: { ru: 'с. Карнак', kk: 'Қарнақ а.' },
      address: { ru: 'ресторан «Хансарай»', kk: '«Хансарай» рестораны' },
      link: '',
    },
  ],
}

export const seedTheory: TheoryTopic[] = [
  {
    id: 't1',
    title: { ru: 'Общие положения и термины', kk: 'Жалпы ережелер мен терминдер' },
    lessons: 4,
    done: 0,
    content: [
      { id: 't1-1', title: { ru: 'Что такое ПДД', kk: 'ЖҚЕ дегеніміз не' }, body: { ru: 'Правила дорожного движения (ПДД) — нормативный документ о порядке движения ТС и пешеходов в РК.', kk: 'Жол қозғалысы ережелері (ЖҚЕ) — ҚР аумағында көлік пен жаяулардың қозғалыс тәртібі туралы құжат.' } },
      { id: 't1-2', title: { ru: 'Участники движения', kk: 'Қозғалысқа қатысушылар' }, body: { ru: 'Участник дорожного движения — водитель, пешеход, пассажир.', kk: 'Жол қозғалысына қатысушы — жүргізуші, жаяу жүргінші, жолаушы.' } },
      { id: 't1-3', title: { ru: 'Транспортное средство', kk: 'Көлік құралы' }, body: { ru: 'ТС — устройство для перевозки по дорогам людей, грузов или оборудования.', kk: 'КҚ — жолдар бойынша адамдарды, жүктерді тасымалдауға арналған құрылғы.' } },
      { id: 't1-4', title: { ru: 'Дорога и проезжая часть', kk: 'Жол және жүру бөлігі' }, body: { ru: 'Дорога — полоса земли для движения ТС. Проезжая часть — элемент дороги для безрельсовых ТС.', kk: 'Жол — көлік қозғалысы үшін жер жолағы. Жүру бөлігі — рельссіз көлікке арналған элемент.' } },
    ],
  },
  {
    id: 't2',
    title: { ru: 'Обязанности водителей и пешеходов', kk: 'Жүргізушілер мен жаяулардың міндеттері' },
    lessons: 3,
    done: 0,
    content: [
      { id: 't2-1', title: { ru: 'Обязанности водителя', kk: 'Жүргізуші міндеттері' }, body: { ru: 'Водитель обязан иметь при себе документы, соблюдать ПДД, быть внимательным.', kk: 'Жүргізуші құжаттарды ұстауы, ЖҚЕ сақтауы, мұқият болуы тиіс.' } },
      { id: 't2-2', title: { ru: 'Обязанности пешехода', kk: 'Жаяу міндеттері' }, body: { ru: 'Пешеходы движутся по тротуарам, переходят дорогу по переходам.', kk: 'Жаяулар тротуармен жүреді, жолды өткелден кесіп өтеді.' } },
      { id: 't2-3', title: { ru: 'Страхование и ответственность', kk: 'Сақтандыру және жауапкершілік' }, body: { ru: 'Обязательное страхование ГПО владельцев ТС.', kk: 'КҚ иелерінің АҚЖ міндетті сақтандыруы.' } },
    ],
  },
]

export const seedRoadSigns: RoadSign[] = [
  { id: 'p-2.1', code: '2.1', shape: 'priority', symbol: '◆', name: { ru: 'Главная дорога', kk: 'Басты жол' }, meaning: { ru: 'Преимущество на нерегулируемом перекрёстке (ПДД РК).', kk: 'Реттелмейтін қиылыста басымдық (ҚР ЖҚЕ).' } },
  { id: 'p-2.4', code: '2.4', shape: 'yield', symbol: '▽', name: { ru: 'Уступите дорогу', kk: 'Жол беріңіз' }, meaning: { ru: 'Уступить ТС на пересекаемой дороге.', kk: 'Қиылысатын жолдағы КҚ-ға жол беру.' } },
  { id: 'p-2.5', code: '2.5', shape: 'stop', symbol: 'STOP', name: { ru: 'Движение без остановки запрещено', kk: 'Тоқтаусыз жүру тыйым' }, meaning: { ru: 'Обязательная остановка перед стоп-линией или краем проезжей части.', kk: 'Стоп-сызық немесе жүру бөлігінің шетінде тоқтау міндетті.' } },
  { id: 'p-3.1', code: '3.1', shape: 'prohibit', symbol: '—', name: { ru: 'Въезд запрещён', kk: 'Кіруге тыйым' }, meaning: { ru: 'Запрещается въезд всех ТС в данном направлении («кирпич»).', kk: 'Барлық КҚ-ға осы бағытта кіруге тыйым.' } },
  { id: 'p-3.2', code: '3.2', shape: 'prohibit', symbol: '○', name: { ru: 'Движение запрещено', kk: 'Қозғалыс тыйым' }, meaning: { ru: 'Запрещается движение всех ТС в обоих направлениях.', kk: 'Барлық КҚ қозғалысына екі бағытта да тыйым.' } },
  { id: 'p-3.4', code: '3.4', shape: 'prohibit', symbol: 'truck', name: { ru: 'Движение грузовых запрещено', kk: 'Жүк көліктеріне тыйым' }, meaning: { ru: 'Запрещены грузовики свыше 3,5 т (если масса не указана), тракторы.', kk: '3,5 т-дан асатын жүк көліктері мен тракторларға тыйым.' } },
  { id: 'p-3.9', code: '3.9', shape: 'prohibit', symbol: 'bike', name: { ru: 'Движение велосипедов запрещено', kk: 'Велосипедтерге тыйым' }, meaning: { ru: 'Запрещается движение велосипедов и мопедов.', kk: 'Велосипедтер мен мопедтерге тыйым.' } },
  { id: 'p-3.10', code: '3.10', shape: 'prohibit', symbol: 'walk', name: { ru: 'Движение пешеходов запрещено', kk: 'Жаяуларға тыйым' }, meaning: { ru: 'Запрещается движение пешеходов.', kk: 'Жаяулар қозғалысына тыйым.' } },
  { id: 'p-3.20', code: '3.20', shape: 'prohibit', symbol: '↔', name: { ru: 'Обгон запрещён', kk: 'Озуға тыйым' }, meaning: { ru: 'Запрещается обгон.', kk: 'Озуға тыйым.' } },
  { id: 'p-3.24', code: '3.24', shape: 'prohibit', symbol: '50', name: { ru: 'Ограничение скорости', kk: 'Жылдамдық шектеуі' }, meaning: { ru: 'Запрещается скорость выше указанной.', kk: 'Көрсетілгеннен жоғары жылдамдық тыйым.' } },
  { id: 'p-3.27', code: '3.27', shape: 'prohibit', symbol: 'P', name: { ru: 'Остановка запрещена', kk: 'Тоқтау тыйым' }, meaning: { ru: 'Запрещаются остановка и стоянка.', kk: 'Тоқтау мен тұраққа тыйым.' } },
  { id: 'm-4.1.1', code: '4.1.1', shape: 'mandatory', symbol: '↑', name: { ru: 'Движение прямо', kk: 'Тура жүру' }, meaning: { ru: 'Разрешается только прямо.', kk: 'Тек тура жүруге рұқсат.' } },
  { id: 'm-4.1.2', code: '4.1.2', shape: 'mandatory', symbol: '→', name: { ru: 'Движение направо', kk: 'Оңға жүру' }, meaning: { ru: 'Разрешается только направо.', kk: 'Тек оңға жүруге рұқсат.' } },
  { id: 'm-4.1.3', code: '4.1.3', shape: 'mandatory', symbol: '←', name: { ru: 'Движение налево', kk: 'Солға жүру' }, meaning: { ru: 'Разрешается только налево.', kk: 'Тек солға жүруге рұқсат.' } },
  { id: 'm-4.3', code: '4.3', shape: 'mandatory', symbol: '↻', name: { ru: 'Круговое движение', kk: 'Шеңберлі қозғалыс' }, meaning: { ru: 'Движение по кругу.', kk: 'Шеңбер бойынша жүру.' } },
  { id: 'm-4.4', code: '4.4', shape: 'mandatory', symbol: 'car', name: { ru: 'Движение легковых автомобилей', kk: 'Жеңіл көліктер қозғалысы' }, meaning: { ru: 'Разрешены легковые, автобусы, мотоциклы и грузовики до 3,5 т (ПДД РК).', kk: 'Жеңіл, автобус, мотоцикл және 3,5 т-ға дейінгі жүк көліктері (ҚР ЖҚЕ).' } },
  { id: 'm-4.5', code: '4.5', shape: 'mandatory', symbol: 'bike', name: { ru: 'Велосипедная дорожка', kk: 'Велосипед жолы' }, meaning: { ru: 'Только велосипеды и мопеды. Пешеходы — если нет тротуара.', kk: 'Тек велосипедтер мен мопедтер. Жаяулар — тротуар болмаса.' } },
  { id: 'm-4.6', code: '4.6', shape: 'mandatory', symbol: 'walk', name: { ru: 'Пешеходная дорожка', kk: 'Жаяу жол' }, meaning: { ru: 'Разрешено движение только пешеходам (ПДД РК).', kk: 'Тек жаяулар қозғалысына рұқсат (ҚР ЖҚЕ).' } },
]

export const seedQuestions: Question[] = [
  {
    id: 'q1',
    q: { ru: 'Что означает красный сигнал светофора?', kk: 'Бағдаршамның қызыл сигналы нені білдіреді?' },
    options: [
      { ru: 'Движение запрещено', kk: 'Қозғалыс тыйым салынған' },
      { ru: 'Движение разрешено', kk: 'Қозғалыс рұқсат' },
      { ru: 'Только поворот направо', kk: 'Тек оңға бұрылу' },
    ],
    correct: 0,
    explain: { ru: 'Красный сигнал запрещает движение.', kk: 'Қызыл сигнал қозғалысты тыяды.' },
  },
]

export const seedInstructors: Instructor[] = [
  {
    id: 'ins-1',
    name: 'Нұрлан Қасымов',
    phone: '+7 701 111 11 11',
    car: 'Toyota Camry',
    categories: ['B', 'B1'],
    slots: ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00'],
  },
  {
    id: 'ins-2',
    name: 'Айбек Сейітов',
    phone: '+7 701 222 22 22',
    car: 'Hyundai Accent',
    categories: ['B', 'B1', 'C', 'C1'],
    slots: ['09:00', '10:30', '12:00', '14:00', '15:30', '17:00'],
  },
  {
    id: 'ins-3',
    name: 'Ерлан Төлеуов',
    phone: '+7 701 333 33 33',
    car: 'GAZelle Next',
    categories: ['C', 'C1'],
    slots: ['09:00', '11:00', '13:00', '15:00', '17:00'],
  },
]

export const seedReviews: Review[] = []
export const seedMessages: Message[] = []
export const seedNotices: Notice[] = []

/** @deprecated use school.routes — kept for compatibility */
export const examRoutes: SchoolRoute[] = seedSchoolRoutes
