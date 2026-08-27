# Москва в кадре

Интерактивная карта инстаграмных мест Москвы: маршруты, личный кабинет,
лента заявок на фотосъёмку, мудборды. Домашнее задание №2 курса по AI-агентам.

## Как запустить

Ничего настраивать не нужно — `app/.env.example` уже содержит рабочие
Supabase URL и publishable key нашего проекта (это не секрет, доступ и так
ограничен RLS-политиками, а не секретностью ключа — детали ниже):

```bash
cd app
npm install
cp .env.example .env.local
npm run dev
```

Открыть `http://localhost:5173`.

Если приложение падает с `supabaseUrl is required.` — не выполнен `cp
.env.example .env.local` (сам `.env.local` в `.gitignore` и не переносится
автоматически, в том числе в новый git worktree).

## Настройка своего Supabase (не обязательно для запуска и проверки)

Нужно только если хотите поднять независимую копию с чистой базой, а не
использовать наш проект из `.env.example`.

1. Создать проект на [supabase.com](https://supabase.com) (free tier достаточно).
   Из Settings → API взять **Project URL** и **anon/publishable key**, вписать
   в `app/.env.local`.
2. В Supabase Dashboard → **SQL Editor** выполнить три файла **строго в этом
   порядке** (каждый — отдельным запуском):
   1. `app/supabase/schema.sql` — шесть таблиц;
   2. `app/supabase/policies.sql` — RLS-политики и триггер дневного лимита;
   3. `app/supabase/seed.sql` — 12 курируемых мест.
   Курируемые места вставляются именно через SQL Editor: у него нет JWT, и
   только поэтому триггер лимита пропускает строки с `source = 'curated'` —
   через клиентский REST API такая вставка запрещена политикой.
3. **Обязательно** включить анонимный вход: Dashboard → **Authentication →
   Sign In / Providers** → **«Allow anonymous sign-ins» → ON**. По умолчанию
   он **выключен**, и без него `signInAnonymously()` возвращает
   `422 anonymous_provider_disabled`: гость не получает `auth.uid()`, а значит
   не может ни добавить место, ни создать заявку.
4. Там же выключить **«Confirm email» → OFF** — иначе e2e-тесты регистрации
   (личный кабинет) зависают на подтверждении почты.

Если приложение падает с `supabaseUrl is required.` — нет `app/.env.local`
(он в `.gitignore` и не переносится сам, в том числе в новый git worktree).

## Проверки

```bash
cd app
npm run build
npm run lint
npm run test       # Vitest — юнит-тесты логики
npm run test:e2e   # Playwright — golden path
```

## Каталог мест

12 курируемых точек на старте (`app/supabase/seed.sql`), расширяется
через workflow `workflow/add-place.md` / скилл `/add-place`.

## Структура

Дизайн — `docs/superpowers/specs/2026-08-27-moscow-photo-map-design.md`.
Планы реализации — `docs/superpowers/plans/`. Журнал сессий — `sessions/`.
Отчёт по заданию — `REPORT.md`.

## Материалы курса (не часть продукта)

Файлы `01`–`05` в корне репозитория — материалы занятия 2, оставлены для
контекста задания, продукта не касаются.
