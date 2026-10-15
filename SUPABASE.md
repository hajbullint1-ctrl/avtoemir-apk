# Подключение Supabase (общие данные)

Сейчас в облако синхронизируются:

- **school** — контакты, филиалы, телефоны записи/поддержки  
- **instructors** — список инструкторов с телефонами  
- **notices** — объявления из админки  

Остальное (учётки, документы студента, записи на занятия) пока в `localStorage`.

## 1. Supabase

1. Создайте проект на [supabase.com](https://supabase.com).
2. **SQL Editor** → New query → вставьте содержимое файла `supabase/schema.sql` → **Run**.
3. **Project Settings → API**:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` / `publishable` key → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

## 2. Vercel

1. Project → **Settings → Environment Variables**
2. Добавьте для **Production** (и Preview при необходимости):

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=eyJ...
```

3. **Redeploy** (Deployments → ⋯ → Redeploy). Без редеплоя переменные не попадут в бандл.

## 3. Локально

```bash
cp .env.example .env.local
# заполните URL и ключ
pnpm dev
```

## 4. Проверка

1. Откройте сайт на устройстве A → `/admin` → измените телефон инструктора или отправьте объявление.
2. Через ~1 сек данные уйдут в таблицу `app_state` (Table Editor в Supabase).
3. Откройте сайт на устройстве B (другой браузер / инкогнито) — должны подтянуться те же инструкторы и объявления.

Если переменных нет — приложение работает как раньше (только localStorage), ошибки в консоли не ломают UI.

## 5. Безопасность

Текущие RLS-политики разрешают **чтение и запись всем** с anon-ключом (удобно для демо).  
Для продакшена ограничьте `insert`/`update` (например, только через service role на сервере или роль admin).


## Профили, прогресс теории и фото уроков

Если проект уже создан, выполните также `supabase/migrations/20261015_profiles_progress_storage.sql`.

- `public.profiles` — `id` аккаунта студента и `full_name` (имя в чате).
- `public.theory_progress` — пройденные уроки (`student_id`, `lesson_id`). У каждого студента свой прогресс.
- Storage bucket `theory-cards` — фото-карточки уроков теории (публичное чтение).

Зеркало этих данных также пишется в `app_state` (`profiles`, `theoryProgress`), чтобы работало и без отдельных таблиц.
