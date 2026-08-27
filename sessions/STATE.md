# Состояние проекта

> Обновляется в конце каждой сессии. Описывает «как есть сейчас», а не
> историю изменений — старое перезаписывается.

**Обновлено:** 2026-08-27, сессия 1, Task 15 (foundation exit checkpoint)

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

## В работе

- Ничего не оставлено на середине правки в момент записи этого файла.

## Не начато

- Три фичи-ветки: `feature/map-routes`, `feature/cabinet`,
  `feature/requests-moodboard`.
- Дизайн-проход `frontend-design`, независимый аудит, агент-ломатель,
  демонстрация песочницы, прогон инъекции недоверенного текста.

## Известные проблемы

- Курируемых мест — 12 из ориентировочных ~40 из спеки; остальные
  добавляются через `/add-place` по мере необходимости, не блокирует MVP.

## Следующий шаг

Foundation-план (`docs/superpowers/plans/2026-08-27-01-foundation.md`,
задачи 0–15) полностью завершён и закрыт этим checkpoint'ом. Дальше —
создать три git worktree (`feature/map-routes`, `feature/cabinet`,
`feature/requests-moodboard`) и запустить по независимому агенту в каждом,
параллельно, согласно планам:

- `docs/superpowers/plans/2026-08-27-02-feature-map-routes.md`
- `docs/superpowers/plans/2026-08-27-03-feature-cabinet.md`
- `docs/superpowers/plans/2026-08-27-04-feature-requests-moodboard.md`

**Bootstrap каждого worktree (иначе приложение падает на старте с
`supabaseUrl is required.`):**
`cp <repo-root>/app/.env.local <worktree>/app/.env.local && cd <worktree>/app && npm install`
перед первым запуском — `.env.local` игнорируется git и не копируется
автоматически, `node_modules/` в worktree тоже нет.

После них — интеграция по `docs/superpowers/plans/2026-08-27-05-integration.md`.
