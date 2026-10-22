import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Политика конфиденциальности — AvtoEmir',
  description: 'Как AvtoEmir обрабатывает персональные данные пользователей приложения автошколы.',
}

export default function PrivacyPage() {
  return (
    <div className="min-h-dvh bg-slate-50 px-4 py-10 text-slate-900">
      <article className="mx-auto w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold text-blue-600">AvtoEmir</p>
        <h1 className="mt-1 text-2xl font-bold">Политика конфиденциальности</h1>
        <p className="mt-2 text-xs text-slate-500">Последнее обновление: 22 октября 2026</p>

        <div className="mt-6 space-y-4 text-sm leading-relaxed text-slate-700">
          <section>
            <h2 className="font-semibold text-slate-900">1. Кто мы</h2>
            <p>
              Приложение AvtoEmir предназначено для учеников автошколы: регистрация, загрузка документов,
              теория ПДД, тесты, запись на вождение и связь с администрацией.
            </p>
          </section>
          <section>
            <h2 className="font-semibold text-slate-900">2. Какие данные собираем</h2>
            <ul className="list-disc space-y-1 pl-5">
              <li>Имя и номер телефона при регистрации</li>
              <li>Загруженные документы заявки (удостоверение, справки)</li>
              <li>Прогресс теории и результаты тестов</li>
              <li>Сообщения в чате с администрацией / инструктором</li>
              <li>Технические данные работы приложения (сессия входа)</li>
            </ul>
          </section>
          <section>
            <h2 className="font-semibold text-slate-900">3. Зачем используем</h2>
            <p>
              Для работы автошколы: проверка документов, обучение, запись на занятия, поддержка учеников.
              Данные хранятся в облачной базе (Supabase) и обрабатываются только для целей сервиса.
            </p>
          </section>
          <section>
            <h2 className="font-semibold text-slate-900">4. Передача третьим лицам</h2>
            <p>
              Мы не продаём персональные данные. Хостинг и база данных предоставляются инфраструктурными
              сервисами (Vercel, Supabase) в рамках работы приложения.
            </p>
          </section>
          <section>
            <h2 className="font-semibold text-slate-900">5. Хранение и безопасность</h2>
            <p>
              Пароли хранятся в виде криптографического хеша (не открытым текстом). Доступ администратора
              защищён отдельным паролем. Рекомендуем использовать уникальный пароль для аккаунта.
            </p>
          </section>
          <section>
            <h2 className="font-semibold text-slate-900">6. Удаление данных</h2>
            <p>
              Вы можете удалить аккаунт в приложении (раздел главной) или отправить запрос на странице
              удаления. Связанные с аккаунтом данные будут удалены.
            </p>
            <p className="mt-2">
              <Link href="/delete-account" className="font-medium text-blue-600 underline-offset-2 hover:underline">
                Запросить удаление аккаунта →
              </Link>
            </p>
          </section>
          <section>
            <h2 className="font-semibold text-slate-900">7. Контакты</h2>
            <p>
              По вопросам персональных данных используйте контакты поддержки, указанные в приложении
              (раздел «Контакты» / «О приложении»).
            </p>
          </section>
        </div>

        <div className="mt-8 flex flex-wrap gap-3 text-sm">
          <Link href="/delete-account" className="text-red-600 underline-offset-2 hover:underline">
            Удаление аккаунта
          </Link>
          <Link href="/" className="text-slate-600 underline-offset-2 hover:underline">
            В приложение
          </Link>
        </div>
      </article>
    </div>
  )
}
