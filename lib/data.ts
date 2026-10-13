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
  branches: Branch[]
}

export type TheoryTopic = { id: string; title: L; lessons: number; done: number }
export type Question = { id: string; q: L; options: L[]; correct: number; explain: L }
export type Instructor = { id: string; name: string; car: string; categories: Category[]; slots: string[] }
export type Review = { id: string; author: string; rating: number; text: string; date: string; visible: boolean }
export type Message = { id: string; thread: string; fromMe: boolean; text: string; time: string }
export type Notice = { id: string; kind: 'lesson' | 'docs' | 'info'; title: L; body: L; time: string; read: boolean }
export type Booking = { id: string; date: string; time: string; instructorId: string }
export type TestResult = { id: string; date: string; score: number; total: number }

export type SignShape = 'prohibit' | 'warning' | 'mandatory' | 'info' | 'stop' | 'yield'
export type RoadSign = { id: string; code: string; shape: SignShape; symbol: string; name: L; meaning: L }

const sampleId: DocFile = { name: 'udostoverenie.png', url: '/images/sample-id.png' }
const sampleCert = (n: string): DocFile => ({ name: n, url: '/images/sample-certificate.png' })

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
  {
    id: 's2',
    name: 'Нурлан Абенов',
    phone: '+7 702 111 22 33',
    category: 'C',
    docs: { idFront: sampleId, idBack: sampleId, psycho: sampleCert('psixo.png'), narco: sampleCert('narko.png') },
    status: 'pending',
    readyDate: null,
    submittedAt: '2026-10-11',
  },
  {
    id: 's3',
    name: 'Ерлан Тулегенов',
    phone: '+7 705 987 65 43',
    category: 'B1',
    docs: { idFront: sampleId, idBack: sampleId, psycho: sampleCert('psixo.png'), narco: sampleCert('narko.png') },
    status: 'approved',
    readyDate: '2026-11-20',
    submittedAt: '2026-10-02',
  },
  {
    id: 's4',
    name: 'Динара Жумабаева',
    phone: '+7 747 321 00 11',
    category: 'C1',
    docs: { idFront: sampleId, idBack: null, psycho: sampleCert('psixo.png'), narco: null },
    status: 'draft',
    readyDate: null,
    submittedAt: null,
  },
]

export const seedSchool: School = {
  name: 'AvtoEmir',
  about: {
    ru: 'AvtoEmir — автошкола в Туркестанской области. Готовим водителей категорий B, B1, C и C1: теория ПДД, практика на автодроме и в городе, подготовка к экзамену в спецЦОН.',
    kk: 'AvtoEmir — Түркістан облысындағы автомектеп. B, B1, C және C1 санаттарының жүргізушілерін дайындаймыз: ЖЕЕ теориясы, автодромда және қалада тәжірибе, арнаулы ХҚКО-да емтиханға дайындық.',
  },
  hours: { ru: 'Пн–Сб: 09:00–19:00, Вс: выходной', kk: 'Дс–Сн: 09:00–19:00, Жс: демалыс' },
  phones: ['+7 (725) 333-28-70', '+7 777 287 00 87'],
  branches: [
    {
      id: 'turkistan',
      city: { ru: 'г. Туркестан', kk: 'Түркістан қ.' },
      address: { ru: 'пр. Тауке Хана, 287', kk: 'Тәуке хан даңғылы, 287' },
      link: 'https://2gis.kz/turkestan/geo/70000001104980724',
    },
    {
      id: 'karnak',
      city: { ru: 'с. Карнак', kk: 'Қарнақ а.' },
      address: { ru: 'рядом с тойханой «Хансарай»', kk: '«Хансарай» тойханасының жанында' },
      link: 'https://2gis.kz/turkestan/search/%D0%A5%D0%B0%D0%BD%D1%81%D0%B0%D1%80%D0%B0%D0%B9%20%D0%9A%D0%B0%D1%80%D0%BD%D0%B0%D0%BA',
    },
  ],
}

export const seedTheory: TheoryTopic[] = [
  { id: 't1', title: { ru: 'Общие положения и термины', kk: 'Жалпы ережелер мен терминдер' }, lessons: 4, done: 4 },
  { id: 't2', title: { ru: 'Обязанности водителей и пешеходов', kk: 'Жүргізушілер мен жаяулардың міндеттері' }, lessons: 5, done: 3 },
  { id: 't3', title: { ru: 'Дорожные знаки', kk: 'Жол белгілері' }, lessons: 8, done: 2 },
  { id: 't4', title: { ru: 'Дорожная разметка', kk: 'Жол таңбасы' }, lessons: 3, done: 0 },
  { id: 't5', title: { ru: 'Сигналы светофора и регулировщика', kk: 'Бағдаршам мен реттеушінің белгілері' }, lessons: 3, done: 0 },
  { id: 't6', title: { ru: 'Проезд перекрёстков', kk: 'Қиылыстардан өту' }, lessons: 6, done: 0 },
  { id: 't7', title: { ru: 'Скорость и обгон', kk: 'Жылдамдық және басып озу' }, lessons: 4, done: 0 },
  { id: 't8', title: { ru: 'Первая медицинская помощь', kk: 'Алғашқы медициналық көмек' }, lessons: 3, done: 0 },
]

export const roadSigns: RoadSign[] = [
  { id: 'r1', code: '2.5', shape: 'stop', symbol: 'STOP', name: { ru: 'Движение без остановки запрещено', kk: 'Тоқтамай жүруге тыйым салынады' }, meaning: { ru: 'Остановитесь перед стоп-линией и уступите дорогу всем ТС на пересекаемой дороге.', kk: 'Тоқтау сызығының алдында тоқтап, қиылысатын жолдағы барлық көлікке жол беріңіз.' } },
  { id: 'r2', code: '2.4', shape: 'yield', symbol: '', name: { ru: 'Уступите дорогу', kk: 'Жол беріңіз' }, meaning: { ru: 'Уступите дорогу транспортным средствам, движущимся по пересекаемой дороге.', kk: 'Қиылысатын жолмен келе жатқан көліктерге жол беріңіз.' } },
  { id: 'r3', code: '3.24', shape: 'prohibit', symbol: '60', name: { ru: 'Ограничение максимальной скорости', kk: 'Ең жоғары жылдамдықты шектеу' }, meaning: { ru: 'Запрещается движение со скоростью, превышающей указанную на знаке (км/ч).', kk: 'Белгіде көрсетілгеннен (км/сағ) жоғары жылдамдықпен жүруге тыйым салынады.' } },
  { id: 'r4', code: '3.1', shape: 'prohibit', symbol: '—', name: { ru: 'Въезд запрещён', kk: 'Кіруге тыйым салынады' }, meaning: { ru: 'Запрещается въезд всех транспортных средств в данном направлении.', kk: 'Осы бағытта барлық көліктің кіруіне тыйым салынады.' } },
  { id: 'r5', code: '1.23', shape: 'warning', symbol: '!', name: { ru: 'Дети', kk: 'Балалар' }, meaning: { ru: 'Участок дороги вблизи детского учреждения. Снизьте скорость.', kk: 'Балалар мекемесінің жанындағы жол учаскесі. Жылдамдықты азайтыңыз.' } },
  { id: 'r6', code: '1.8', shape: 'warning', symbol: '●', name: { ru: 'Светофорное регулирование', kk: 'Бағдаршаммен реттеу' }, meaning: { ru: 'Впереди перекрёсток или переход, регулируемый светофором.', kk: 'Алда бағдаршаммен реттелетін қиылыс немесе өтпе жол бар.' } },
  { id: 'r7', code: '4.1.1', shape: 'mandatory', symbol: '↑', name: { ru: 'Движение прямо', kk: 'Тура жүру' }, meaning: { ru: 'Разрешается движение только прямо.', kk: 'Тек тура жүруге рұқсат етіледі.' } },
  { id: 'r8', code: '5.16.1', shape: 'info', symbol: 'P', name: { ru: 'Место стоянки', kk: 'Тұрақ орны' }, meaning: { ru: 'Обозначает место, где разрешена стоянка транспортных средств.', kk: 'Көліктердің тұруына рұқсат етілген орынды білдіреді.' } },
]

export const seedQuestions: Question[] = [
  {
    id: 'q1',
    q: { ru: 'Какая максимальная скорость разрешена легковому автомобилю в населённом пункте?', kk: 'Елді мекенде жеңіл автомобильге қандай ең жоғары жылдамдыққа рұқсат етіледі?' },
    options: [
      { ru: '50 км/ч', kk: '50 км/сағ' },
      { ru: '60 км/ч', kk: '60 км/сағ' },
      { ru: '70 км/ч', kk: '70 км/сағ' },
    ],
    correct: 1,
    explain: { ru: 'По ПДД РК в населённых пунктах разрешено движение со скоростью не более 60 км/ч.', kk: 'ҚР ЖЕЕ бойынша елді мекендерде 60 км/сағ-тан аспайтын жылдамдықпен жүруге рұқсат етіледі.' },
  },
  {
    id: 'q2',
    q: { ru: 'Что означает мигающий жёлтый сигнал светофора?', kk: 'Бағдаршамның жыпылықтаған сары белгісі нені білдіреді?' },
    options: [
      { ru: 'Движение запрещено', kk: 'Жүруге тыйым салынады' },
      { ru: 'Нерегулируемый перекрёсток, соблюдайте осторожность', kk: 'Реттелмейтін қиылыс, сақ болыңыз' },
      { ru: 'Скоро включится зелёный', kk: 'Жақында жасыл жанады' },
    ],
    correct: 1,
    explain: { ru: 'Мигающий жёлтый разрешает движение и информирует о нерегулируемом перекрёстке.', kk: 'Жыпылықтаған сары жүруге рұқсат береді және реттелмейтін қиылыс туралы хабарлайды.' },
  },
  {
    id: 'q3',
    q: { ru: 'На каком расстоянии от железнодорожного переезда запрещена остановка?', kk: 'Темір жол өткелінен қандай қашықтықта тоқтауға тыйым салынады?' },
    options: [
      { ru: 'Ближе 30 м', kk: '30 м-ден жақын' },
      { ru: 'Ближе 50 м', kk: '50 м-ден жақын' },
      { ru: 'Ближе 100 м', kk: '100 м-ден жақын' },
    ],
    correct: 1,
    explain: { ru: 'Остановка запрещена ближе 50 м от железнодорожного переезда.', kk: 'Темір жол өткелінен 50 м-ден жақын тоқтауға тыйым салынады.' },
  },
  {
    id: 'q4',
    q: { ru: 'Кто имеет преимущество на нерегулируемом перекрёстке равнозначных дорог?', kk: 'Тең маңызды жолдардың реттелмейтін қиылысында кімнің артықшылығы бар?' },
    options: [
      { ru: 'Тот, кто движется прямо', kk: 'Тура жүріп келе жатқан' },
      { ru: 'Помеха справа', kk: 'Оң жақтағы кедергі' },
      { ru: 'Более крупное ТС', kk: 'Үлкенірек көлік' },
    ],
    correct: 1,
    explain: { ru: 'На перекрёстке равнозначных дорог водитель обязан уступить ТС, приближающимся справа.', kk: 'Тең маңызды жолдар қиылысында жүргізуші оң жақтан келе жатқан көлікке жол беруге міндетті.' },
  },
  {
    id: 'q5',
    q: { ru: 'Разрешено ли пользоваться телефоном за рулём без громкой связи?', kk: 'Рульде отырып, телефонды қолмен ұстап сөйлесуге бола ма?' },
    options: [
      { ru: 'Разрешено на остановке у светофора', kk: 'Бағдаршамда тұрғанда болады' },
      { ru: 'Запрещено во время движения', kk: 'Қозғалыс кезінде тыйым салынады' },
      { ru: 'Разрешено вне города', kk: 'Қаладан тыс болады' },
    ],
    correct: 1,
    explain: { ru: 'Во время движения запрещено пользоваться телефоном без устройства hands-free.', kk: 'Қозғалыс кезінде hands-free құрылғысынсыз телефон пайдалануға тыйым салынады.' },
  },
]

export const seedInstructors: Instructor[] = [
  { id: 'i1', name: 'Бауыржан Ахметов', car: 'Chevrolet Cobalt • МКПП', categories: ['B', 'B1'], slots: ['09:00', '10:30', '12:00', '14:00', '15:30', '17:00'] },
  { id: 'i2', name: 'Самат Оразбаев', car: 'Hyundai Accent • АКПП', categories: ['B'], slots: ['09:00', '11:00', '13:00', '15:00', '17:00'] },
  { id: 'i3', name: 'Канат Жунусов', car: 'ГАЗель Next • C/C1', categories: ['C', 'C1'], slots: ['10:00', '12:00', '14:00', '16:00'] },
]

export const seedReviews: Review[] = [
  { id: 'rv1', author: 'Мадина К.', rating: 5, text: 'Отличная автошкола! Инструктор Бауыржан очень терпеливый, сдала с первого раза.', date: '2026-09-28', visible: true },
  { id: 'rv2', author: 'Асхат Т.', rating: 5, text: 'Нұсқаушылар тәжірибелі, автодром жақсы жабдықталған. Ұсынамын!', date: '2026-09-15', visible: true },
  { id: 'rv3', author: 'Ольга П.', rating: 4, text: 'Удобное приложение для тестов и записи. Хотелось бы больше вечерних слотов.', date: '2026-08-30', visible: true },
  { id: 'rv4', author: 'Гость', rating: 1, text: 'Спам ссылка …', date: '2026-10-10', visible: false },
]

export const seedMessages: Message[] = [
  { id: 'm1', thread: 'admin', fromMe: false, text: 'Здравствуйте! Загрузите, пожалуйста, документы во вкладке «Главная».', time: '09:12' },
  { id: 'm2', thread: 'i1', fromMe: false, text: 'Добрый день! Жду вас на занятии, не забудьте удостоверение.', time: '18:40' },
]

export const seedNotices: Notice[] = [
  { id: 'n1', kind: 'lesson', title: { ru: 'Напоминание о занятии', kk: 'Сабақ туралы еске салу' }, body: { ru: 'Завтра в 10:30 — вождение на автодроме с Бауыржаном А.', kk: 'Ертең 10:30-да — Бауыржан А.-мен автодромда жүргізу.' }, time: '2026-10-13 08:00', read: false },
  { id: 'n2', kind: 'info', title: { ru: 'Добро пожаловать в AvtoEmir', kk: 'AvtoEmir-ге қош келдіңіз' }, body: { ru: 'Выберите категорию и загрузите документы для зачисления.', kk: 'Санатты таңдап, оқуға түсу үшін құжаттарды жүктеңіз.' }, time: '2026-10-12 09:00', read: true },
]

export const examRoutes: { id: string; name: L; steps: L[] }[] = [
  {
    id: 'er1',
    name: { ru: 'Маршрут №1 — центр', kk: '№1 бағыт — орталық' },
    steps: [
      { ru: 'СпецЦОН → пр. Тауке Хана', kk: 'Арнаулы ХҚКО → Тәуке хан даңғылы' },
      { ru: 'Регулируемый перекрёсток, левый поворот', kk: 'Реттелетін қиылыс, солға бұрылу' },
      { ru: 'Пешеходный переход у школы', kk: 'Мектеп жанындағы жаяу жүргінші өткелі' },
      { ru: 'Разворот и возврат к СпецЦОН', kk: 'Кері бұрылу және арнаулы ХҚКО-ға оралу' },
    ],
  },
  {
    id: 'er2',
    name: { ru: 'Маршрут №2 — кольцо', kk: '№2 бағыт — айналма' },
    steps: [
      { ru: 'СпецЦОН → ул. Б. Саттарханова', kk: 'Арнаулы ХҚКО → Б. Саттарханов к-сі' },
      { ru: 'Круговое движение', kk: 'Айналма қозғалыс' },
      { ru: 'Остановка у правого края дороги', kk: 'Жолдың оң жақ шетінде тоқтау' },
      { ru: 'Возврат по главной дороге', kk: 'Басты жолмен оралу' },
    ],
  },
]
