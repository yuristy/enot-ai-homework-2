# Handoff результатов Codex для Claude

> Координационный файл в основном worktree. Не заменяет подробные отчёты
> в Codex-ветках и не означает, что их изменения уже интегрированы в `main`.

## Готовые работы

| Ветка | SHA | Результат |
|---|---|---|
| `codex/isolation-demo` | `032b3c1` | Демонстрация sandbox isolation через shell и `apply_patch` |
| `codex/prompt-injection-demo` | `030dc8f` | Сравнение prompt injection на `gpt-5.6-luna/low` и `gpt-5.6-sol/high` |
| `codex/prompt-injection-demo` | `cc6815d` | Предварительный read-only аудит feature-веток |
| `codex/prompt-injection-demo` | `40a58a5` | Handoff ответственности за `sessions/` |

Worktree:

- `/Users/yuri/Developer/work-codex-isolation`;
- `/Users/yuri/Developer/work-codex-injection`.

## Как прочитать без checkout и merge

```bash
git show 032b3c1:docs/isolation-test-codex.md
git show 030dc8f:docs/prompt-injection-test-codex.md
git show 40a58a5:docs/codex-pre-integration-audit.md
```

`40a58a5` содержит актуальную версию audit-отчёта; commits `cc6815d` и
`40a58a5` нужно переносить вместе, если используется `cherry-pick`.

## Что должен сделать Claude

1. Дождаться чистых exit checkpoint всех трёх feature-веток.
2. Учесть findings из `docs/codex-pre-integration-audit.md` до merge.
3. Перенести Codex-отчёты в итоговую историю, например:

   ```bash
   git cherry-pick 032b3c1 030dc8f cc6815d 40a58a5
   ```

4. Обновить канонические:
   - `sessions/session-N.md`;
   - `sessions/TOOLS.md`;
   - `sessions/STATE.md`;
   - итоговый `REPORT.md`.
5. В session-журнале сослаться на полные отчёты, указав SHA, модель,
   reasoning, CLI/sandbox и честные результаты. Дословный вывод повторно
   копировать не требуется.
6. Проверить, что feature-контроллеры обновили session-журнал на своих exit
   checkpoint.
7. Перед сдачей убедиться, что нужные commits доступны в опубликованном
   репозитории. Локальные worktree сами по себе проверяющему не видны.

## Владелец sessions

Канонический каталог `sessions/` ведёт Claude как главный интеграционный
контроллер. Codex хранит первичные доказательства в `docs/` и намеренно не
редактирует `sessions/STATE.md` или `sessions/TOOLS.md` в параллельной ветке,
чтобы не создавать конфликтующие версии состояния.

## Бюджет Claude и экономный порядок продолжения

Три параллельных feature-контроллера — вероятно, самая дорогая уже
выполненная фаза по лимиту Claude: параллельность сокращает wall-clock time,
но контекст, чтение файлов и tool results каждого агента оплачиваются
отдельно. После exit checkpoint не нужно держать три длинные сессии активными.

Ориентир для распределения **оставшегося** лимита:

| Этап | Доля |
|---|---:|
| Завершение трёх feature и exit checkpoint | 25% |
| Merge, конфликты и cross-feature wiring | 18% |
| `frontend-design` и визуальная проверка | 15% |
| Golden path, Playwright и отладка | 22% |
| Независимый breaker/audit и fixes | 12% |
| README, REPORT, `sessions/`, финальная проверка | 8% |

Это оценка для планирования, а не тарификация Anthropic. Фактический расход
нужно проверять командой `/usage`; размер контекста — `/context`.

Правила экономии без снижения функциональной полноты:

1. Возобновить существующие feature-сессии, не создавать им замену. Дать
   каждой только закрыть оставшиеся задачи, findings аудита и exit checkpoint.
2. Сразу после чистого checkpoint получить SHA + краткий handoff и завершить
   feature-сессию; не поручать ей интеграционные задачи.
3. Интеграцию вести одним контроллером последовательно. Перед ней выполнить
   `/clear` и загрузить планы, SHA и этот handoff вместо восстановления трёх
   длинных историй. Внутри одного этапа при необходимости использовать
   `/compact`.
4. Основную реализацию выполнять на Sonnet/default. Дорогую модель включать
   точечно для действительно сложного merge, архитектурного решения или
   трудно воспроизводимой ошибки; простые проверки и документацию отдавать
   более дешёвой модели, если она доступна в текущем плане.
5. Между checkpoint запускать targeted tests. Полный suite обязателен после
   каждой feature, после merge, после design-pass и перед сдачей, но его не
   нужно без причины повторять после каждой локальной правки.
6. Выполнить один согласованный screenshot/browser-pass по фиксированной
   матрице маршрутов и viewport, затем повторить только затронутые экраны.
7. Breaker и независимый финальный audit запускать короткими свежими сессиями
   только на объединённой зелёной сборке, с узким charter и stop condition.
8. Оставлять около 20% каждого пятичасового окна на retry и исправление
   неожиданных интеграционных ошибок. Если включены дополнительные usage
   credits, установить явный spending cap.
9. Независимые Codex-эксперименты, evidence и предварительный аудит не
   повторять в Claude: переносить готовые коммиты и кратко отражать их в
   `sessions/`.

Рекомендуемые окна после обновления лимита:

1. Завершить только три feature и получить три exit SHA.
2. Одним контроллером выполнить merge, cross-feature wiring и стабилизацию.
3. Выполнить design-pass, golden path и Playwright.
4. Резерв: breaker/audit, fixes, документация и финальный secret scan.

## Главные findings предварительного аудита

- High: `MyRoutesList` строит относительный `?start=...` и остаётся на
  `/cabinet`, вместо открытия карты.
- High: `ProfileForm` не гидратирует локальный draft после асинхронной
  загрузки существующего профиля.
- Medium: новый moodboard `error` возвращается hook, но пока не выводится
  экраном.
- Medium: favorites/routes игнорируют ошибки записи Supabase.
- Low: `RequestForm` создаёт второй экземпляр `useRequests` и лишние fetch.
- `app/e2e/dbg.spec.ts` в map-worktree — временный диагностический файл.

Полные обоснования находятся в commit `40a58a5`, файл
`docs/codex-pre-integration-audit.md`.

## Состояние на момент handoff

- `feature/map-routes`: dirty после прежнего checkpoint;
- `feature/cabinet`: clean, но ещё без предусмотренных e2e и exit checkpoint;
- `feature/requests-moodboard`: dirty, ещё без предусмотренных e2e и exit
  checkpoint;
- Codex не изменял `app/`, feature-worktree, `REPORT.md` или session-файлы.

## Отчёт текущего параллельного потока — 2026-08-27

Codex завершил независимый блок, пока feature-контроллеры Claude ожидают
обновления лимита:

- добавил в этот handoff стратегию экономии Claude без сокращения acceptance
  scope;
- провёл read-only security/pre-integration review;
- выполнил secret scan без чтения/вывода содержимого локального `.env.local`;
- подготовил ограниченный по времени charter для будущего свежего
  breaker-агента;
- сознательно не повторял уже завершённый prompt-injection эксперимент, так
  как новый прогон не закрывал бы дополнительный критерий ДЗ.

Новые материалы для Claude:

- `docs/superpowers/codex-briefs/codex-parallel-work-report.md` — полный отчёт,
  security findings, triage и инструкции для `sessions/`;
- `docs/superpowers/codex-briefs/codex-breaker-charter.md` — матрица будущей
  независимой проверки, бюджет и stop condition.

Ни один файл `app/`, чужой worktree, `sessions/`, `README.md` или `REPORT.md`
в этом потоке не изменялся. Подтверждённые branch-local blockers следует
закрыть в существующих feature-сессиях; post-merge hypotheses — проверять
одним integration controller и коротким свежим breaker-сеансом по charter.

## Integration-readiness pack — 2026-08-27

Пока Claude ожидает лимит, Codex дополнительно подготовил четыре независимых
артефакта без изменения продукта:

- `codex-integration-rehearsal.md` — реальный `git merge-tree` по трём парам
  веток: конфликтует только `app/src/App.tsx`; дан целевой final composition;
- `codex-playwright-readiness.md` — gaps текущего golden-path плана,
  стабильная acceptance-матрица и экономный порядок прогонов;
- `codex-frontend-design-blueprint.md` — применённый `frontend-design` план:
  tokens, layout, signature, responsive/a11y и 12 screenshot states;
- `codex-homework-evidence-matrix.md` — обязательные/опциональные критерии,
  локальные SHA, publishing risks и audit обязательного workflow.

Ключевые решения для Claude:

1. Не выделять отдельного агента на merge: текущий rehearsal показывает один
   предсказуемый конфликт `App.tsx`.
2. Не использовать `toHaveCount(12)` для markers на живой пополняемой БД.
3. Не делать один огромный mutation-heavy golden test: оставить focused specs
   и один cross-feature flow с уникальными данными.
4. Не считать видимый heading/button доказательством favorite/moodboard/save;
   проверять сохранённый результат после навигации/reload.
5. На design-pass реализовать blueprint после merge, не смешивая CSS commit с
   hook/data-flow fixes.
6. Перед сдачей сделать достижимыми из опубликованного `main` все Codex SHA и
   feature merge commits; сейчас они локальны.
