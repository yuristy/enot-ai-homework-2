# Состояние проекта

> Обновляется в конце каждой сессии. Описывает «как есть сейчас», а не
> историю изменений — старое перезаписывается.

**Обновлено:** 2026-08-27, ветка `feature/map-routes` (worktree
`../work-map-routes`), Task 8 (feature exit checkpoint)

## Готово

### `feature/map-routes` (эта ветка, задачи 1–8 плана
`docs/superpowers/plans/2026-08-27-02-feature-map-routes.md`)

- Экран карты `app/src/features/map/MapScreen.tsx`, собирающий все части
  фичи: `PlacesMap` (react-leaflet, маркеры curated/user, попап с кнопкой
  добавления в маршрут, клик по пустому месту карты задаёт стартовую
  точку, полилиния построенного маршрута), `TagFilter` (фильтр по тегам,
  список тегов считается по нефильтрованному списку мест), `RouteTray`
  (счётчик выбранных мест, геолокация/сброс старта, копирование ссылки на
  маршрут), `RouteSummary` (дистанция/время/сложность, текст явно говорит
  «по прямой» — расстояния по прямой линии, не по дорогам, спека §15),
  `AddPlaceForm` (форма добавления места гостем/зарегистрированным
  пользователем, предупреждение о близких дублях с подтверждением
  повторной отправкой, обработка ошибки лимита текстом из `lib/limits.ts`
  без своей копии).
- `app/src/features/map/usePlaces.ts` — хук загрузки мест из Supabase,
  использует общий маппер `rowToPlace` из `lib/mappers.ts` (не дублирует
  его локально).
- `app/src/features/map/useRouteState.ts` — `routeReducer` (чистый,
  протестирован без React: TOGGLE add/remove, SET_START, CLEAR_START,
  LOAD) + обёртка-хук `useRouteState`, синхронизация с URL через
  `parseRouteFromUrl`/`buildRouteUrl` из уже готового `lib/route.ts`.
- react-leaflet 5.0.0 + leaflet 1.9.4 + @types/leaflet 1.9.22 — маркеры
  доступны с клавиатуры (`<Marker keyboard>`), подтверждено e2e-тестом.
- e2e: `app/e2e/route-sharing.spec.ts` (гость строит маршрут из 2+ мест,
  копирует ссылку, открывает её на новой странице — маршрут
  восстанавливается идентично) и `app/e2e/map-keyboard-nav.spec.ts` (Tab
  доходит до маркера, Enter открывает попап) — оба зелёные, без
  скипов/ослабленных проверок (это ровно тот пробел, который поймал
  аудит ДЗ №1). `playwright.config.ts` дополнен
  `permissions: ['clipboard-read', 'clipboard-write']`.
- Vitest: 6 файлов, 33 теста, все зелёные (было 3 файла/18 тестов на
  Foundation, добавлены тесты `useRouteState.test.ts` в TDD-стиле).
- **Task 8 — feature exit checkpoint пройден.** Прогнано вручную из
  `app/` 2026-08-27: `npm run build` (`tsc -b && vite build`, ✓, есть
  безобидное предупреждение о размере чанка >500kB — не блокирует),
  `npm run lint` (`oxlint`, без ошибок), `npm run test` (33/33), `npm run
  test:e2e` (3/3: smoke, route-sharing, map-keyboard-nav, против реального
  проекта Supabase).
- **Известный сайд-эффект прогонов e2e/ручной проверки:** тесты Task 6
  (add-place form) и Task 8 писали реальные записи в таблицу `places`
  живого Supabase-проекта (в т.ч. id 24–28 от ручной проверки Task 6);
  DELETE-политики для гостя нет, почистить может только владелец проекта
  через дашборд — не блокирует MVP, но датасет `source='user'` в проде
  временно содержит тестовые записи.
- **Ветка НЕ смёржена в `main`** — интеграция трёх feature-веток
  (`map-routes`, `cabinet`, `requests-moodboard`) выполняется отдельным
  планом `docs/superpowers/plans/2026-08-27-05-integration.md`.

### Foundation (`main`, задачи 0–15 `docs/superpowers/plans/2026-08-27-01-foundation.md`)

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

- Две другие фичи-ветки выполняются параллельно другими контроллерами:
  `feature/cabinet`, `feature/requests-moodboard` (не эта ветка, не трогать).
- Дизайн-проход `frontend-design`, независимый аудит, агент-ломатель,
  демонстрация песочницы, прогон инъекции недоверенного текста — по плану
  интеграции, после мёржа всех трёх веток.

## Известные проблемы

- Курируемых мест — 12 из ориентировочных ~40 из спеки; остальные
  добавляются через `/add-place` по мере необходимости, не блокирует MVP.
- `RouteSummary` рендерится с нулевыми значениями (0.0 км, 0 мин, «Лёгкий»),
  если стартовая точка задана, но не выбрано ни одного места — так задано
  буквальным кодом плана (нет проверки `selectedPlaces.length` перед
  рендером), решение оставлено ревьюером как minor/plan-mandated, не
  блокирует MVP.
- В таблице `places` живого Supabase-проекта остались тестовые записи
  (`source='user'`, id 24–28 и, вероятно, ещё несколько от e2e-прогонов)
  от ручной проверки Task 6/8 этой ветки — удалить может только владелец
  проекта, DELETE-политики для клиента нет.

## Следующий шаг

`feature/map-routes` (эта ветка, worktree `../work-map-routes`) — задачи
1–8 полностью завершены, ревью каждой задачи прошло чисто (одна
поправка контроллера в Task 7 задокументирована в SDD-ledger:
`.superpowers/sdd/2026-08-27-02-feature-map-routes/progress.md`).
Финальный сквозной ревью всей ветки — следующий шаг перед сдачей.

Ветка НЕ смёржена в `main`. Интеграция трёх feature-веток
(`map-routes`, `cabinet`, `requests-moodboard`) — отдельный план
`docs/superpowers/plans/2026-08-27-05-integration.md`, вне зоны
ответственности этой ветки.

**Bootstrap worktree (уже выполнено для `../work-map-routes`, актуально
для остальных двух, если ещё не сделано):**
`cp <repo-root>/app/.env.local <worktree>/app/.env.local && cd <worktree>/app && npm install`
— `.env.local` игнорируется git и не копируется автоматически,
`node_modules/` в worktree тоже нет.
