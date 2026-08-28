# Журнал инструментов

> Только дополняется, старые записи не редактируются.

## 2026-08-27 · Сессия 1 · Vite + React 19 + TypeScript

- **Тип:** фреймворк/сборщик (npm)
- **Установка:** `npm create vite@latest -- --template react-ts`, версии
  зафиксированы точно (без `^`/`~`) в `app/package.json`: react 19.2.8,
  react-dom 19.2.8, vite 8.2.2, typescript 7.0.2, @types/react 19.2.18,
  @types/react-dom 19.2.5, @vitejs/plugin-react 6.1.0, @types/node 24.13.3
- **Зачем:** стек проекта по дизайн-спеке
- **Область:** проект
- **Проверка:** `npm run build` и `npm run lint` проходят без ошибок

## 2026-08-27 · Сессия 1 · react-router-dom

- **Тип:** библиотека (npm)
- **Установка:** `npm view react-router-dom version` → `npm install
  --save-exact react-router-dom` → 7.18.2 в `app/package.json`
- **Зачем:** роутинг трёх (позже четырёх) маршрутов приложения без
  собственного роутера
- **Область:** проект
- **Проверка:** peer-зависимости (`react >=18`, `react-dom >=18`)
  совместимы с React 19.2.8 без конфликтов; в dev-сервере все три маршрута
  (`/`, `/requests`, `/cabinet`) отдают верный заголовок, активная
  nav-ссылка получает класс `nav-link--active`

## 2026-08-27 · Сессия 1 · Supabase (@supabase/supabase-js)

- **Тип:** BaaS + библиотека (npm)
- **Установка:** проект `moscow-photo-map` создан на supabase.com
  (контроллером), ключи — в `app/.env.local` (не в git, есть
  `app/.env.example` с плейсхолдерами); `npm install --save-exact
  @supabase/supabase-js` → 2.112.4
- **Зачем:** auth (в т.ч. анонимный), Postgres, RLS — без своего бэкенда
- **Область:** проект + внешний сервис
- **Проверка:** `curl` к `/auth/v1/settings` вернул HTTP 200 с конфигом
  auth (валидная пара URL/ключ); анонимный вход был по умолчанию выключен
  в проекте (`422 anonymous_provider_disabled`), контроллер включил его в
  дашборде (заодно выключил «Confirm email») и подтвердил `curl`-ом к
  `/auth/v1/signup` (валидный JWT с `amr: anonymous`); схема
  (`schema.sql`), RLS-политики и триггер лимита (`policies.sql`) и seed
  (`seed.sql`) применены контроллером через Supabase SQL Editor и
  проверены `curl`-запросами и SQL Editor'ом: анонимный лимит 1/день
  срабатывает (повторная вставка в тот же день → `rate_limit_exceeded`),
  курируемые места (`source='curated'`) от лимита освобождены, ровно 12
  строк подтверждены запросом. Подробности — `sessions/session-1.md`,
  раздел «Заметки контроллера»

## 2026-08-27 · Сессия 1 · Vitest

- **Тип:** тест-раннер (npm)
- **Установка:** `npm install --save-exact --save-dev vitest` → 4.1.11,
  конфиг `app/vitest.config.ts`
- **Зачем:** юнит-тесты чистой логики (`route.ts`, `places.ts`,
  `limits.ts`) в TDD-стиле; в ДЗ №1 главным замечанием было полное
  отсутствие автотестов — здесь они обязательны с первой сессии
- **Область:** проект
- **Проверка:** `npm run test` → 3 файла, 18 тестов, все зелёные

## 2026-08-27 · Сессия 1 · Playwright (@playwright/test)

- **Тип:** e2e-тест-раннер (npm)
- **Установка:** `npm install --save-exact --save-dev @playwright/test` →
  1.62.1, `npx playwright install --with-deps chromium`, конфиг
  `app/playwright.config.ts`
- **Зачем:** сквозная проверка boot приложения (golden path) поверх
  юнит-тестов
- **Область:** проект
- **Проверка:** `npm run test:e2e` → 1 тест зелёный (`e2e/smoke.spec.ts`:
  главная страница загружается, заголовок виден)

## 2026-08-27 · Сессия 1 · oxlint

- **Тип:** линтер (npm)
- **Установка:** поставлен scaffolder'ом `npm create vite@latest`, версия
  зафиксирована точно → 1.80.0; `app/.oxlintrc.json` переопределён вручную
  (env.browser=true, пустые rules), скрипт `"lint": "oxlint src"`
- **Зачем:** быстрая проверка стиля/ошибок без отдельной настройки ESLint
- **Область:** проект
- **Проверка:** `npm run lint` — 0 ошибок/предупреждений на каждом шаге
  Tasks 1–13

## 2026-08-27 · Ветка `feature/map-routes` · react-leaflet + leaflet

- **Тип:** библиотека карты (npm)
- **Установка:** `npm view react-leaflet peerDependencies` подтвердил
  совместимость с React 19 перед установкой; `npm install --save-exact
  react-leaflet@5.0.0 leaflet@1.9.4` + `npm install --save-exact
  --save-dev @types/leaflet@1.9.22`; CSS Leaflet подключён в
  `app/src/main.tsx` (`import 'leaflet/dist/leaflet.css'`)
- **Зачем:** рендер карты Москвы с маркерами мест (курируемые/от
  пользователей), клик по карте задаёт стартовую точку маршрута,
  полилиния построенного маршрута — задачи 2 и 4 плана
  `docs/superpowers/plans/2026-08-27-02-feature-map-routes.md`
- **Область:** проект (только `app/src/features/map/PlacesMap.tsx`)
- **Проверка:** `npm run build`/`npm run lint` зелёные; e2e
  `app/e2e/map-keyboard-nav.spec.ts` подтверждает, что маркер доступен
  по Tab (`<Marker keyboard>` действительно даёт фокусируемый
  `.leaflet-marker-icon` с рабочим Enter → попап) — это тот самый пробел
  клавиатурной доступности, который поймал аудит ДЗ №1, здесь закрыт
  реальным зелёным тестом, а не смягчённой проверкой. Отдельная поправка
  в этом же файле в Task 7: убран дублирующий `eventHandlers.click` на
  `<Marker>` (клик по маркеру теперь только открывает попап, тоггл
  выбора — только через кнопку в попапе) — без этого e2e-тест
  `route-sharing.spec.ts` не мог пройти по-настоящему (клик по маркеру
  одновременно открывал попап и переключал выбор, так что кнопка «Добавить
  в маршрут» никогда не находилась текстом). Решение задокументировано и
  подтверждено ревью как обоснованное, не ослабление теста.
