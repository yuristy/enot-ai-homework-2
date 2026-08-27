# Москва в кадре

Интерактивная карта инстаграмных мест Москвы: маршруты, личный кабинет,
лента заявок на фотосъёмку, мудборды. Домашнее задание №2 курса по AI-агентам.

## Как запустить

```bash
cd app
npm install
cp .env.example .env.local   # вписать свои Supabase URL и anon key
npm run dev
```

Открыть `http://localhost:5173`.

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
