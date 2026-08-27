# Сессия 1 — Фундамент (карта инстаграмных мест Москвы)

- **Дата начала:** 2026-08-27
- **Ассистент:** Claude Code
- **Статус:** в работе

## Промпты

### Task 1: Scaffold Vite + React + TypeScript project

Реализовать scaffolding проекта с помощью `npm create vite@latest`, установить точные версии зависимостей, добавить oxlint, проверить сборку и линтинг.

## Размышления

- Scaffolder выбрал версии как есть: React 19.2.8, Vite 8.2.2, TypeScript 7.0.2
- .oxlintrc.json был переопределен вручную в соответствии с требованиями (простая конфиг с env.browser=true, пустые rules)
- Лексика package.json переведена на точные версии без ^ и ~ префиксов
- Сборка прошла успешно, линт вернул 0 ошибок/предупреждений на чистом scaffolded шаблоне

## Использованные инструменты

| Инструмент | Действие | Зачем |
|---|---|---|
| npm create vite@latest | Генерация scaffold проекта | Создание базовой структуры Vite + React + TypeScript |
| npm view | Получение точных версий пакетов | Pinning зависимостей для воспроизводимости |
| npm install | Установка dependencies | Подготовка к сборке и линтингу |
| npm run build | Сборка проекта | Проверка, что TypeScript и Vite работают корректно |
| npm run lint | Запуск oxlint | Проверка, что линтер правильно настроен |
| git add & commit | Коммит изменений | Сохранение работы в git |

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
