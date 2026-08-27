# Сессия 1 — Фундамент (карта инстаграмных мест Москвы)

- **Дата начала:** 2026-08-27
- **Ассистент:** Claude Code
- **Статус:** в работе

## Промпты

### Task 1: Scaffold Vite + React + TypeScript project

Реализовать scaffolding проекта с помощью `npm create vite@latest`, установить точные версии зависимостей, добавить oxlint, проверить сборку и линтинг.

### Task 2: Add react-router-dom and the app shell

Установить react-router-dom с точной версией, заменить дефолтный App.tsx/main.tsx на реальный shell приложения: Header с навигацией (NavLink), Layout-обёртку и три route-заглушки (`/`, `/requests`, `/cabinet`) для трёх параллельных feature-веток. Проверить в dev-сервере, что все три маршрута рендерят заголовок-плейсхолдер и активная ссылка навигации подсвечивается классом `nav-link--active`. Прогнать build и lint, закоммитить.

## Размышления

- Scaffolder выбрал версии как есть: React 19.2.8, Vite 8.2.2, TypeScript 7.0.2
- .oxlintrc.json был переопределен вручную в соответствии с требованиями (простая конфиг с env.browser=true, пустые rules)
- Лексика package.json переведена на точные версии без ^ и ~ префиксов
- Сборка прошла успешно, линт вернул 0 ошибок/предупреждений на чистом scaffolded шаблоне
- react-router-dom зафиксирован на точной версии 7.18.2 (последняя на момент установки), peerDependencies (`react >=18`, `react-dom >=18`) совместимы с React 19.2.8 без конфликтов
- App.tsx полностью переписан: дефолтный scaffold-контент (счётчик, ссылки на Vite/React) убран, вместо него — `<Layout>` с `<Routes>` из трёх заглушек-компонентов, по одному на каждую будущую feature-ветку (map-routes, requests-moodboard, cabinet)
- Header использует `NavLink` с функцией `className`, которая добавляет `nav-link--active` при активном маршруте; `end` на корневой ссылке `/`, чтобы она не подсвечивалась на вложенных путях
- main.tsx обёрнут в `BrowserRouter`; App.css сценарного scaffold-стиля оставлен в проекте неиспользуемым (не в скоупе задачи — его затронут либо не затронут последующие фичи)
- Проверка в dev-сервере (через Chrome DevTools MCP) подтвердила: `/` → «Карта», `/requests` → «Заявки», `/cabinet` → «Кабинет», и в каждом случае `document.querySelector('.nav-link--active')` возвращает соответствующий пункт меню

## Использованные инструменты

| Инструмент | Действие | Зачем |
|---|---|---|
| npm create vite@latest | Генерация scaffold проекта | Создание базовой структуры Vite + React + TypeScript |
| npm view | Получение точных версий пакетов | Pinning зависимостей для воспроизводимости |
| npm install | Установка dependencies | Подготовка к сборке и линтингу |
| npm run build | Сборка проекта | Проверка, что TypeScript и Vite работают корректно |
| npm run lint | Запуск oxlint | Проверка, что линтер правильно настроен |
| git add & commit | Коммит изменений | Сохранение работы в git |
| npm view react-router-dom version | Получение точной версии пакета | Pinning react-router-dom |
| npm install --save-exact | Установка react-router-dom | Точная версия без ^/~ |
| Chrome DevTools MCP (navigate, javascript_tool) | Проверка маршрутов в браузере | Визуальное подтверждение рендера заголовков и подсветки активной nav-ссылки |

## Изменения в проекте

### Task 1 (Commit 2defff4)
- Создана папка `app/` с полным scaffolded проектом Vite + React + TypeScript
- Обновлен `app/package.json` с точными версиями всех зависимостей:
  - react: 19.2.8
  - react-dom: 19.2.8
  - vite: 8.2.2
  - typescript: 7.0.2
  - @types/react: 19.2.18
  - @types/react-dom: 19.2.5
  - @vitejs/plugin-react: 6.1.0
  - oxlint: 1.80.0
  - @types/node: 24.13.3
- Обновлен `app/.oxlintrc.json` под требования (browser env, пустые rules)
- Обновлен lint скрипт на "oxlint src"
- Установлены dependencies
- Проверена сборка (npm run build) — успешна
- Проверен линтинг (npm run lint) — 0 ошибок/предупреждений

### Task 2 (Commit 0c8152e)
- Установлен `react-router-dom` версии 7.18.2 (точная версия) в `app/package.json` и `app/package-lock.json`
- Создан `app/src/components/Header.tsx` — навигация из трёх `NavLink` («Карта», «Заявки», «Кабинет»), активная ссылка получает класс `nav-link--active`
- Создан `app/src/components/Layout.tsx` — обёртка с Header и `<main className="app-main">`
- Переписан `app/src/App.tsx` — дефолтный scaffold-контент заменён на `<Routes>` с тремя заглушками (`/`, `/requests`, `/cabinet`)
- Обновлён `app/src/main.tsx` — приложение обёрнуто в `BrowserRouter`
- Проверено в dev-сервере: все три маршрута отдают правильный `<h1>`-плейсхолдер, активная nav-ссылка подсвечивается
- Проверена сборка (npm run build) — успешна
- Проверен линтинг (npm run lint) — 0 ошибок/предупреждений (exit code 0)

### Task 3 (Commit 14db7de)
- Установлен `vitest` версии 4.1.11 (точная версия) с флагом `--save-exact --save-dev`
- Создан `app/vitest.config.ts` с конфигурацией: окружение Node, glob pattern `tests/**/*.test.ts`
- Добавлен скрипт `"test": "vitest run"` в `app/package.json`
- Создана папка `app/tests/` для будущих тестов
- Написан smoke-тест `app/tests/smoke.test.ts` для проверки работоспособности runner'а
- Тест запущен: `npm run test` → 1 passed (1 файл, 1 тест)
- Smoke-тест удалён (выполнил свою роль — доказал, что runner работает)
- Коммит с установкой Vitest: `app/package.json`, `app/package-lock.json`, `app/vitest.config.ts`

### Task 4: Set up Playwright
- Получена текущая версия @playwright/test: 1.62.1 (npm view)
- Установлен `@playwright/test` версии 1.62.1 (точная версия) с флагом `--save-exact --save-dev`
- Запущена команда `npx playwright install --with-deps chromium` — успешно загружены браузер Chromium 151.0.7922.34 и зависимости
- Создан `app/playwright.config.ts` с конфигурацией: testDir `./e2e`, webServer на порту 5183, baseURL `http://localhost:5183`, проект для Desktop Chrome
- Добавлен скрипт `"test:e2e": "playwright test"` в `app/package.json`
- Создана папка `app/e2e/` для e2e-тестов
- Написан smoke e2e-тест `app/e2e/smoke.spec.ts`: проверяет загрузку главной страницы и видимость заголовка "Москва в кадре"
- Тест запущен: `npm run test:e2e` → 1 passed (234ms)
- Smoke-тест сохранён — по требованию brief это базовая проверка boot'а приложения, которая остаётся на месте для последующих feature-веток
- Коммит с установкой Playwright: `app/package.json`, `app/package-lock.json`, `app/playwright.config.ts`, `app/e2e/smoke.spec.ts` (Commit a7cbd4a)

### Task 5: Supabase project, client, and anonymous session bootstrap (Commit 2c5251d)
- Проект Supabase `moscow-photo-map` создан контроллером через браузерную автоматизацию заранее (шаг вне зоны ответственности этой задачи)
- Получена точная версия `@supabase/supabase-js`: 2.112.4 (npm view), установлена с `--save-exact` — конфликтов peer dependencies с React 19 не обнаружено
- Создан `app/.env.example` с плейсхолдерами `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`
- Создан `app/.env.local` (не коммитится) с реальными URL и publishable-ключом проекта
- Проверено: корневой `.gitignore` уже игнорирует `app/.env` и `app/.env.local`; в `app/.gitignore` добавлена секция `# Secrets` с явными `.env`/`.env.local` (belt-and-suspenders для тех, кто открывает `app/` напрямую)
- Написан `app/src/lib/supabaseClient.ts`: экспортирует `supabase` (клиент), `ensureSession()` (переиспользует существующую сессию или создаёт анонимную через `signInAnonymously()`) и `isAnonymousSession()`
- В `app/src/main.tsx` добавлен вызов `ensureSession().catch(...)` перед `createRoot(...).render(...)`; существующий `BrowserRouter`/render-код из Task 2 не тронут
- Проверка через `curl` к `https://eksnsyyiwqarpllrhbhe.supabase.co/auth/v1/settings` с publishable-ключом вернула HTTP 200 с конфигурацией auth — пара URL/ключ валидна
- Обнаружено и задокументировано как concern: в настройках проекта `anonymous_users: false` — анонимные вход отключены на уровне Supabase Auth Providers, из-за чего `signInAnonymously()` возвращает `422 anonymous_provider_disabled`; код `ensureSession()` корректно перехватывает эту ошибку и логирует её через `console.error`, приложение не падает, но фактический анонимный вход не срабатывает, пока настройка не будет включена вручную в дашборде (Authentication → Sign In / Providers → Anonymous Sign-Ins) — вне моих инструментов (нет доступа к браузеру/Management API)
- `npm run build` и `npm run lint` — без ошибок
- `npm run dev` — сервер стартует, страница отдаёт 200, без синтаксических/рантайм-ошибок сборки
- Коммит: `app/.env.example`, `app/.gitignore`, `app/src/lib/supabaseClient.ts`, `app/src/main.tsx`, `app/package.json`, `app/package-lock.json` (Commit 2c5251d); `app/.env.local` в коммит не попал (подтверждено `git status`)

### Task 6: Database schema — tables (Commit d653e06)
- Написан `app/supabase/schema.sql` с шестью таблицами согласно спецификации:
  - `public.profiles`: id (uuid FK auth.users), role (enum: seeker/photographer), display_name, created_at
  - `public.places`: id (auto-identity), name, description, lat/lng (double precision), tags (text[] array), photo_url, source (enum: curated/user), created_by (uuid FK, nullable), created_at
  - `public.favorites`: composite PK (user_id, place_id), both с каскадным удалением, created_at
  - `public.requests`: id (auto-identity), request_type (enum: seeking_photographer/offering_photography), place_id (FK, nullable), wanted_date, comment, author_id (uuid FK), created_at
  - `public.routes`: id (auto-identity), user_id (uuid FK с delete cascade), title, start_lat/start_lng (double precision), place_ids (bigint[] array), created_at
  - `public.moodboards`: id (auto-identity), user_id (uuid FK с delete cascade), title, place_ids (bigint[] array), created_at
- Проведена ручная проверка SQL на синтаксическую корректность: все таблицы имеют matching парантезы, точки с запятой в конце, типы данных и constraints соответствуют бриву
- Примечание: применение schema в Supabase Dashboard (Step 2 из бриева) вне зоны ответственности этой задачи — контроллер выполнит его отдельно
- Коммит: `app/supabase/schema.sql` (Commit d653e06)

### Task 7: Row Level Security и триггер дневного лимита (Commit 0d2dea6)
- Написан `app/supabase/policies.sql` — транскрипция SQL из брифа задачи, сверена программно (побайтовое сравнение fenced-блока брифа с записанным файлом) — результат `MATCH`
- RLS включён для всех шести таблиц (`profiles`, `places`, `favorites`, `requests`, `routes`, `moodboards`)
- Политики: `profiles` — select/insert/update только для владельца, insert дополнительно требует `is_anonymous = false` в JWT (только зарегистрированные аккаунты могут иметь профиль); `places`/`requests` — открытый select, insert требует `auth.uid()` = владеющая колонка (`created_by`/`author_id`), фактическое ограничение по квоте — в триггере, не в политике; `favorites`/`routes`/`moodboards` — `for all`, владелец + не-анонимная сессия, и в `using`, и в `with check`
- Написана функция `enforce_daily_limit()` (plpgsql): сначала проверка исключения для curated-записей places (`tg_table_name = 'places' and new.source = 'curated'` → немедленный `return new`, до проверки автора) — это заранее внесённый в бриф фикс для Task 8, где seed-записи не имеют `created_by`; затем определение автора (`created_by` для places, `author_id` для requests), проверка на null, чтение `is_anonymous` из JWT для выбора лимита (1 анонимно / 5 зарегистрированным), подсчёт записей автора за сегодня и `raise exception 'rate_limit_exceeded'` при достижении лимита
- Созданы два триггера `places_rate_limit` и `requests_rate_limit` — `before insert ... for each row`, оба вызывают `enforce_daily_limit()`
- Проведена ручная проверка соответствия колонок схеме из Task 6: `profiles.id`, `places.created_by`, `requests.author_id`, `favorites.user_id`/`place_id`, `routes.user_id`, `moodboards.user_id` — все совпадают
- Проведена ручная трассировка трёх сценариев логики триггера:
  - (a) анонимный пользователь вставляет 2-е место за день (`source='user'`) → exemption не срабатывает (source ≠ curated) → today_count=1 ≥ daily_limit=1 → `rate_limit_exceeded` — верно
  - (b) зарегистрированный пользователь вставляет 6-й запрос за день → today_count=5 ≥ daily_limit=5 → `rate_limit_exceeded` — верно
  - (c) вставка curated-места с `created_by = null` → exemption срабатывает первым и делает `return new` до проверки `author is null` → вставка проходит без исключения — верно
- Шаги брифа "применить в Supabase" и "проверить через curl" сознательно пропущены — вне зоны ответственности этой задачи (нет доступа к браузеру/БД), выполнит контроллер отдельно
- Коммит: `app/supabase/policies.sql` (Commit 0d2dea6)

### Task 8: Curated places seed data (Commit 6ec40ed)
- Написан `app/supabase/seed.sql` с точным содержимым из брифа задачи: INSERT INTO public.places с 12 куриируемыми московскими локациями
- Все 12 строк содержат: name (русское название места), description (русское описание), lat/lng (координаты с двойной точностью), tags (PostgreSQL text-array в формате `'{"tag1","tag2"}'` с использованием двойных кавычек внутри одинарных), photo_url (null для всех), source ('curated' для всех — фиксирует источник и обеспечивает обход дневного лимита в триггере из Task 7)
- Проведена самопроверка:
  - Количество мест: ровно 12 (по требованию)
  - Source = 'curated' для каждой строки: да (триггер из Task 7 пропускает curated-записи, что позволяет им обойти проверку daily_limit несмотря на `created_by = null`)
  - Синтаксис SQL: корректен (INSERT INTO, правильные скобки/запятые, массивы tags в нотации PostgreSQL)
  - Координаты: все действительные широта/долгота московского региона (55.6–55.8 N, 37.5–37.7 E)
  - Строки: 1) Смотровая площадка Воробьёвы горы; 2) Парк Зарядье; 3) Патриаршие пруды; 4) ГУМ; 5) Артплей; 6) Крутицкое подворье; 7) Царицыно; 8) Библиотека Ленина; 9) Останкинская телебашня; 10) Электрозавод; 11) Коломенское; 12) Никольская улица
- Шаги брифа "применить в Supabase" и "проверить через curl" пропущены — вне зоны ответственности (нет доступа к БД), контроллер выполнит отдельно
- Коммит: `app/supabase/seed.sql` (Commit 6ec40ed)
