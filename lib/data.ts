import type { L } from './i18n'

export type Category = 'B' | 'B1' | 'C' | 'C1'
export const CATEGORIES: Category[] = ['B', 'B1', 'C', 'C1']

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
}

export type Branch = { id: string; city: L; address: L; link: string }
export type School = {
  name: string
  about: L
  hours: L
  phones: string[]
  /** Phone for enrollment / recording to driving school */
  phoneEnrollment: string
  /** App support hotline */
  phoneSupport: string
  branches: Branch[]
  instagram: string
  website: string
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
  /** Student account id. Admin replies in that student's chat keep the same id. */
  studentId?: string
  /** Snapshot of profiles.full_name (or admin/instructor label) */
  authorName?: string
}

export type Profile = { id: string; full_name: string; phone: string }
export type Notice = { id: string; kind: 'lesson' | 'docs' | 'info' | 'announce'; title: L; body: L; time: string; read: boolean }
export type Booking = { id: string; date: string; time: string; instructorId: string }
export type TestResult = { id: string; date: string; score: number; total: number }

export type SignShape = 'prohibit' | 'warning' | 'mandatory' | 'info' | 'stop' | 'yield'
export type RoadSign = {
  id: string
  code: string
  shape: SignShape
  symbol: string
  name: L
  meaning: L
  imageUrl?: string | null
}

export const seedStudents: Student[] = [
  {
    id: 'me',
    name: 'Айдана Серикова',
    phone: '+7 701 555 12 34',
    category: 'B',
    docs: { idFront: null, idBack: null, psycho: null, narco: null },
    status: 'draft',
    readyDate: null,
    submittedAt: null,
  },
]

export const seedSchool: School = {
  name: 'AvtoEmir',
  about: {
    ru: 'Автошкола AvtoEmir — обучение вождению категорий B, B1, C, C1 в Туркестане и Карнаке.',
    kk: 'AvtoEmir автомектебі — Түркістан мен Қарнақта B, B1, C, C1 санаттары бойынша жүргізуге оқыту.',
  },
  hours: { ru: 'Пн–Сб 9:00–18:00', kk: 'Дс–Сб 9:00–18:00' },
  phones: ['+7 701 000 00 00'],
  phoneEnrollment: '+7 701 111 11 11',
  phoneSupport: '+7 701 222 22 22',
  instagram: 'https://www.instagram.com/avtoshkola_turkestan_avtoemir?mdxt=MWlrYTNiaTJyNnh2cw==',
  website: '',
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
      { id: 't2-1', title: { ru: 'Обязанности водителя', kk: 'Жүргізушінің міндеттері' }, body: { ru: 'Водитель обязан иметь при себе удостоверение, документы на ТС и полис ОГПО.', kk: 'Жүргізуші куәлік, КҚ құжаттары және МГЖС полисін алып жүруге міндетті.' } },
      { id: 't2-2', title: { ru: 'Запреты', kk: 'Тыйымдар' }, body: { ru: 'Запрещается управлять ТС в состоянии опьянения и пользоваться телефоном без hands-free.', kk: 'Мас күйінде КҚ басқаруға және hands-free-сіз телефонға тыйым салынады.' } },
      { id: 't2-3', title: { ru: 'Пешеходы', kk: 'Жаяу жүргіншілер' }, body: { ru: 'Пешеходы должны двигаться по тротуарам и переходить дорогу по переходам.', kk: 'Жаяу жүргіншілер тротуармен жүріп, өткелдер бойынша жолды кесіп өтуі тиіс.' } },
    ],
  },
  {
    id: 't3',
    title: { ru: 'Дорожные знаки', kk: 'Жол белгілері' },
    lessons: 3,
    done: 0,
    content: [
      { id: 't3-1', title: { ru: 'Группы знаков', kk: 'Белгілер топтары' }, body: { ru: 'Знаки: предупреждающие, запрещающие, предписывающие, информационные, приоритета.', kk: 'Белгілер: ескерту, тыйым салу, нұсқау, ақпараттық, басымдық.' } },
      { id: 't3-2', title: { ru: 'Знаки приоритета', kk: 'Басымдық белгілері' }, body: { ru: 'Устанавливают очерёдность проезда перекрёстков.', kk: 'Қиылыстардан өту кезегін белгілейді.' } },
      { id: 't3-3', title: { ru: 'Запрещающие знаки', kk: 'Тыйым салу белгілері' }, body: { ru: 'Круглые знаки с красной каймой запрещают действия с места установки.', kk: 'Қызыл жиегі бар дөңгелек белгілер орнату орнынан тыйым салады.' } },
    ],
  },
  { id: 't4', title: { ru: 'Дорожная разметка', kk: 'Жол таңбасы' }, lessons: 2, done: 0, content: [
    { id: 't4-1', title: { ru: 'Горизонтальная разметка', kk: 'Көлденең таңба' }, body: { ru: 'Обозначает полосы, стоп-линии и пешеходные переходы.', kk: 'Жолақтарды, тоқтау сызықтарын және өткелдерді белгілейді.' } },
    { id: 't4-2', title: { ru: 'Временная разметка', kk: 'Уақытша таңба' }, body: { ru: 'При несоответствии руководствуйтесь временной разметкой.', kk: 'Сәйкес келмесе уақытша таңбаны басшылыққа алыңыз.' } },
  ]},
  { id: 't5', title: { ru: 'Сигналы светофора и регулировщика', kk: 'Бағдаршам мен реттеушінің белгілері' }, lessons: 2, done: 0, content: [
    { id: 't5-1', title: { ru: 'Светофор', kk: 'Бағдаршам' }, body: { ru: 'Красный — запрещает, жёлтый — предупреждает, зелёный — разрешает.', kk: 'Қызыл — тыйым, сары — ескерту, жасыл — рұқсат.' } },
    { id: 't5-2', title: { ru: 'Регулировщик', kk: 'Реттеуші' }, body: { ru: 'Сигналы регулировщика имеют преимущество перед светофором и знаками приоритета.', kk: 'Реттеуші сигналдары бағдаршам мен басымдық белгілерінен артық.' } },
  ]},
  { id: 't6', title: { ru: 'Проезд перекрёстков', kk: 'Қиылыстардан өту' }, lessons: 2, done: 0, content: [
    { id: 't6-1', title: { ru: 'Равнозначные дороги', kk: 'Тең маңызды жолдар' }, body: { ru: 'Действует правило «помеха справа».', kk: '«Оң жақтағы кедергі» ережесі қолданылады.' } },
    { id: 't6-2', title: { ru: 'Главная и второстепенная', kk: 'Басты және қосалқы' }, body: { ru: 'С второстепенной уступите ТС на главной.', kk: 'Қосалқыдан бастыдағы көлікке жол беріңіз.' } },
  ]},
  { id: 't7', title: { ru: 'Скорость и обгон', kk: 'Жылдамдық және басып озу' }, lessons: 2, done: 0, content: [
    { id: 't7-1', title: { ru: 'Ограничения скорости', kk: 'Жылдамдық шектеулері' }, body: { ru: 'В населённых пунктах — не более 60 км/ч, если иное не установлено знаками.', kk: 'Елді мекенде белгілермен өзгеше көрсетілмесе — 60 км/сағ.' } },
    { id: 't7-2', title: { ru: 'Обгон', kk: 'Басып озу' }, body: { ru: 'Запрещён на пешеходных переходах, ж/д переездах и в конце подъёма.', kk: 'Өткелдерде, темір жолда және көтерілістің соңында тыйым салынады.' } },
  ]},
  { id: 't8', title: { ru: 'Первая медицинская помощь', kk: 'Алғашқы медициналық көмек' }, lessons: 2, done: 0, content: [
    { id: 't8-1', title: { ru: 'Порядок действий', kk: 'Әрекет тәртібі' }, body: { ru: 'Оцените обстановку, вызовите 103, обеспечьте безопасность, окажите помощь.', kk: 'Жағдайды бағалаңыз, 103 шақырыңыз, қауіпсіздікті қамтамасыз етіңіз.' } },
    { id: 't8-2', title: { ru: 'Кровотечение', kk: 'Қан кету' }, body: { ru: 'При артериальном кровотечении наложите жгут выше раны и укажите время.', kk: 'Артериялық қан кетуде жгут салып, уақытын көрсетіңіз.' } },
  ]},
]

export const seedRoadSigns: RoadSign[] = [
  { id: 'r1', code: '2.5', shape: 'stop', symbol: 'STOP', name: { ru: 'Движение без остановки запрещено', kk: 'Тоқтамай жүруге тыйым салынады' }, meaning: { ru: 'Остановитесь перед стоп-линией.', kk: 'Тоқтау сызығының алдында тоқтаңыз.' }, imageUrl: null },
]

export const seedQuestions: Question[] = [
  {
    id: 'q1',
    q: { ru: 'Разрешена ли остановка на пешеходном переходе?', kk: 'Жаяу жүргінші өткелінде тоқтауға бола ма?' },
    options: [
      { ru: 'Разрешена', kk: 'Болады' },
      { ru: 'Запрещена', kk: 'Тыйым салынады' },
      { ru: 'Только ночью', kk: 'Тек түнде' },
    ],
    correct: 1,
    explain: { ru: 'Остановка на пешеходном переходе запрещена.', kk: 'Жаяу жүргінші өткелінде тоқтауға тыйым салынады.' },
    imageUrl: null,
  },
]

export const seedInstructors: Instructor[] = [
  {
    id: 'i1',
    name: 'Бауыржан Ахметов',
    phone: '+7 701 234 56 78',
    car: 'Chevrolet Cobalt • МКПП',
    categories: ['B', 'B1'],
    slots: ['09:00', '10:30', '12:00', '14:00', '15:30', '17:00'],
  },
  {
    id: 'i2',
    name: 'Самат Оразбаев',
    phone: '+7 702 345 67 89',
    car: 'Hyundai Accent • АКПП',
    categories: ['B'],
    slots: ['09:00', '11:00', '13:00', '15:00', '17:00'],
  },
  {
    id: 'i3',
    name: 'Канат Жунусов',
    phone: '+7 705 456 78 90',
    car: 'ГАЗель Next • C/C1',
    categories: ['C', 'C1'],
    slots: ['10:00', '12:00', '14:00', '16:00'],
  },
]

export const seedReviews: Review[] = [
  { id: 'rv1', author: 'Мадина К.', rating: 5, text: 'Отличная автошкола!', date: '2026-09-28', visible: true },
]

export const seedMessages: Message[] = [
  { id: 'm1', thread: 'admin', fromMe: false, text: 'Здравствуйте! Загрузите документы.', time: '09:12' },
]

export const seedNotices: Notice[] = [
  { id: 'n1', kind: 'info', title: { ru: 'Добро пожаловать', kk: 'Қош келдіңіз' }, body: { ru: 'Выберите категорию и загрузите документы.', kk: 'Санатты таңдап, құжаттарды жүктеңіз.' }, time: '2026-10-12 09:00', read: true },
]

export const examRoutes: { id: string; name: L; steps: L[] }[] = [
  { id: 'er1', name: { ru: 'Маршрут №1', kk: '№1 бағыт' }, steps: [{ ru: 'Старт', kk: 'Бастау' }] },
]
