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
