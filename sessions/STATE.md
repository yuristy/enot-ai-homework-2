# Состояние проекта

> Обновляется в конце каждой сессии. Описывает «как есть сейчас», а не
> историю изменений — старое перезаписывается.

**Обновлено:** 2026-08-28, ветка `feature/requests-moodboard`, Task 7 (exit checkpoint)

## Готово

- Скелет Vite + React 19 + TypeScript в `app/` (Task 1).
- Роутинг с тремя маршрутами-заглушками (`/`, `/requests`, `/cabinet`) через
  `react-router-dom`, `Header`/`Layout`-компоненты (Task 2); `/moodboard`
  добавится веткой `feature/requests-moodboard`.
- Supabase: клиент и анонимный вход (`app/src/lib/supabaseClient.ts`, Task 5;
  анонимный вход был выключен в настройках проекта, контроллер включил его
  в дашборде и подтвердил `curl`-ом — см. `sessions/session-1.md`, раздел
  «Заметки контроллера»), схема шести таблиц (`app/supabase/schema.sql`,
  Task 6), RLS-политики и триггер дневного лимита (1 анонимно / 5
  зарегистрированным) (`app/supabase/policies.sql`, Task 7), 12 курируемых
  мест (`app/supabase/seed.sql`, Task 8). Проект живой, схема и данные
  применены контроллером через SQL Editor и проверены вручную через `curl`
  (см. `sessions/session-1.md`, раздел «Заметки контроллера»): анонимный
  лимит 1/день срабатывает корректно (повторная вставка в тот же день
  возвращает `rate_limit_exceeded`), курируемые места (`source='curated'`)
  освобождены от лимита, ровно 12 строк подтверждены через
  `GET /rest/v1/places?source=eq.curated`.
- Общие модули с тестами: `lib/types.ts` (общие TS-типы всех сущностей,
  Task 9), `lib/route.ts` (haversine, nearest-neighbor маршрут, оценка
  времени/сложности, кодек URL, Task 10), `lib/places.ts` (дедуп по радиусу
  100м, Task 11), `lib/limits.ts` (маппинг ошибки лимита в текст, Task 12).
- Минимальный общий UI-кит: `Button`, `Card`, базовые layout/nav-стили в
  `index.css` (Task 13).
- Vitest и Playwright настроены и зелёные: `npm run test` → 3 файла, 18
  тестов, все проходят; `npm run test:e2e` → 1 тест (boot-smoke), проходит.
- **Task 15 — foundation exit checkpoint пройден.** Полный набор проверок
  прогнан вручную из `app/` 2026-08-27 и подтверждён живым выводом команд:
  - `npm run build` → `tsc -b && vite build`, `✓ 70 modules transformed`,
    `✓ built in 133ms`, без ошибок.
  - `npm run lint` → `oxlint src`, завершился без вывода ошибок/предупреждений.
  - `npm run test` → `Test Files 3 passed (3)`, `Tests 18 passed (18)`.
  - `npm run test:e2e` → `1 passed` (`e2e/smoke.spec.ts` — home page loads
    the header).
  - Проверка секретов: `git status --short` не показывает `app/.env.local`
    (файл существует на диске, `git check-ignore -v app/.env.local` →
    `app/.gitignore:28:.env.local`, т.е. правильно игнорируется);
    `git ls-files | grep -i env` → только `app/.env.example` с плейсхолдерами
    (`your-anon-key-here`); `git grep` по литералу реального
    publishable-ключа из `app/.env.local` (значение намеренно не
    приводится здесь, чтобы не закоммитить его самим этим файлом) по всему
    репозиторию не дал совпадений — ключ нигде не закоммичен, живёт только
    в негейченном `app/.env.local`.

- **Ветка `feature/requests-moodboard` (план
  `docs/superpowers/plans/2026-08-27-04-feature-requests-moodboard.md`)
  завершена и прошла ревью.** Публичная лента заявок на фотосъёмку
  (`app/src/features/requests/`): чтение доступно всем без авторизации
  (`RequestsScreen`, `RequestCard`, хук `useRequests`), создание —
  `RequestForm` с дневным лимитом через уже существующий Postgres-триггер
  и `lib/limits.ts` для текста ошибки; `useRequests.create()` использует
  `ensureSession()` (не голый `getSession()`) — гарантирует наличие сессии
  до вставки, независимо от гонки с анонимным входом в `main.tsx`.
  Мудборды (`app/src/features/moodboard/`): чистая логика с тестами
  (`palette.ts` — `extractAverageColor`, `collageGridTemplate`), экран
  сборки коллажа из избранного для зарегистрированных аккаунтов
  (`MoodboardScreen`, `MoodboardCollage`, хук `useMoodboards` с явным
  состоянием ошибки на всех трёх обращениях к Supabase — загрузка
  избранного, загрузка мудбордов, сохранение), с понятными сообщениями
  для гостя («доступно только зарегистрированным») и для пустого
  избранного. Маршрут `/moodboard` подключён в `App.tsx`, пункт меню — в
  `Header.tsx`. E2e-тест `app/e2e/requests-limit.spec.ts` проверяет
  golden path гостя (одна заявка проходит, вторая в тот же день
  блокируется) на реальном Supabase-проекте.
  - Попутно найден и исправлен реальный баг живого триггера
    `enforce_daily_limit()` (общая инфраструктура Foundation, не файлы
    этой ветки): функция обращалась к `new.source` в одном булевом
    выражении, общем для триггеров и `places`, и `requests` — `requests`
    не имеет этого поля, из-за чего **любая** вставка в `requests` падала
    с `record "new" has no field "source"`. Найдено при ручной проверке
    Task 3, исправлено и применено к живой базе владельцем проекта
    (коммит `60d48fc` в `main`, не в этой ветке — файл общий).
  - Попутно найден и исправлен баг в `useRequests.ts` (Task 2, коммит
    `91aefd2`): `fetchRequests()` выставлял `loading=true` на каждый
    вызов, включая refetch после успешного создания — `RequestsScreen`
    при `loading=true` размонтирует всё дерево, включая `RequestForm` с
    его локальным сообщением «Заявка опубликована.», так что
    подтверждение пользователь фактически не видел. Исправлено флагом
    `hasLoadedOnce`, чтобы состояние загрузки показывалось только на
    самый первый fetch.
  - **Известный, осознанно отложенный пробел** (зафиксирован планом
    заранее, не случайный недосмотр): `extractAverageColor` протестирован
    изолированно, но не подключён к реальным пикселям через offscreen
    `<canvas>` — курированные seed-данные не имеют `photo_url`, коллаж
    рисует плашки с именем места вместо усреднённого цвета. Подключение —
    отдельная небольшая задача после того, как в базе появятся реальные
    фото (через `/add-place`).
  - Полный набор проверок пройден: `npm run build`, `npm run lint`,
    `npm run test` (33/33), `npm run test:e2e` (2/2, включая новый
    `requests-limit.spec.ts`) — все зелёные на момент этого checkpoint'а.
  - Ветка НЕ смёржена в `main` и её worktree НЕ удалён — по плану интеграции
    (`docs/superpowers/plans/2026-08-27-05-integration.md`) это делает
    отдельный процесс после того, как все три фичи-ветки готовы.

## В работе

- Ничего не оставлено на середине правки в момент записи этого файла.

## Не начато

- Слияние трёх фичи-веток в `main` по плану интеграции.
- Дизайн-проход `frontend-design`, независимый аудит, агент-ломатель,
  демонстрация песочницы, прогон инъекции недоверенного текста.

## Известные проблемы

- Курируемых мест — 12 из ориентировочных ~40 из спеки; остальные
  добавляются через `/add-place` по мере необходимости, не блокирует MVP.
- См. выше «известный, осознанно отложенный пробел» про
  `extractAverageColor` в мудбордах.

## Следующий шаг

`feature/requests-moodboard` готова к интеграции наравне с
`feature/map-routes` и `feature/cabinet` — см.
`docs/superpowers/plans/2026-08-27-05-integration.md`.

**Bootstrap каждого worktree (иначе приложение падает на старте с
`supabaseUrl is required.`):**
`cp <repo-root>/app/.env.local <worktree>/app/.env.local && cd <worktree>/app && npm install`
перед первым запуском — `.env.local` игнорируется git и не копируется
автоматически, `node_modules/` в worktree тоже нет.
