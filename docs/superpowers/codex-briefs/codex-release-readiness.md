# Codex release-readiness notes

Дата снимка: 2026-08-28. Документ подготовлен в изолированной ветке
`codex/route-parser-hardening`; он не изменяет `main` и предназначен для
cherry-pick контроллером после проверки.

## Git-метрики параллельной работы

Отсчёт — от foundation-коммита `c80c7c1`:

| Ветка | Коммитов после foundation | Изменения в `app/` | Последний SHA |
| --- | ---: | ---: | --- |
| `feature/map-routes` | 9 | 16 файлов, +708/-5 | `321de1b` |
| `feature/cabinet` | 5 | 13 файлов, +519/-11 | `9c200ef` |
| `feature/requests-moodboard` | 8 | 13 файлов, +499/-5 | `97d31ba` |

Это git-метрики, а не оценка стоимости Claude: токены, кредиты и длительность
сессий из репозитория достоверно определить нельзя.

## Dependency и security smoke-check

- `git grep` по отслеживаемым файлам не нашёл service-role/private-key или
  API-key паттернов; `app/.env.example` содержит только явно обозначенный
  publishable key.
- `npm audit --json` запускался с Node 24, но registry был недоступен
  (`ENOTFOUND registry.npmjs.org`). Результат нельзя считать доказательством
  отсутствия уязвимостей — повторить в сети перед сдачей.
- `npm outdated --json` также не получил сетевой ответ. Не обновлять
  зависимости механически перед интеграцией.
- В текущем окружении системный Node 20.5.1 слишком стар для актуального
  toolchain; проверки route-parser проходят на Node 24.19.0. Перед финальной
  сдачей зафиксировать в README требование Node `>=22.12.0` (или согласованное
  фактическое требование lockfile) и повторить build/lint/test именно им.

## Перед merge в main

1. Claude проверяет feature-ветки и cherry-pick'ит `b42b07b` после интеграции
   либо переносит те же изменения вручную.
2. Повторяет `npm audit`, `npm outdated`, `git diff --check` и secret scan в
   сетевом окружении.
3. Не коммитит автоматически `sessions/HANDOFF.md`, учебные PDF/MD и локальные
   `.env`-файлы.
4. После merge запускает полный Vitest, build, lint и Playwright golden path.
