# Playwright readiness и экономная acceptance-матрица

## Что уже есть

- `smoke.spec.ts` — boot/header;
- `route-sharing.spec.ts` — route URL;
- `map-keyboard-nav.spec.ts` — Tab/Enter до Leaflet marker;
- запланированы `cabinet-favorites.spec.ts`, `requests-limit.spec.ts` и один
  большой `golden-path.spec.ts`.

Map-ветка включает clipboard permissions в `playwright.config.ts` и запускает
specs `fullyParallel` в отдельных browser contexts. Однако все contexts
пишут в один внешний Supabase project; данные переживают test run.

## Findings текущего плана

### [High] Ровно 12 markers — нестабильное ожидание

`golden-path.spec.ts` планирует `toHaveCount(12)`, но `places` публично
пополняется user rows. После первого add-place/manual test маркеров больше 12.
Проверять наличие 12 curated rows лучше через API/filter, а в UI — `count >= 12`
или наличие известных seed-place names.

### [High] План не покрывает весь заявленный golden path

Из пунктов spec §14 отсутствуют или проверяются поверхностно:

- shared URL в большом test не открывается, это делает только отдельный spec;
- add-place + второй anonymous limit не автоматизированы;
- favorite подтверждается только заголовком «Избранное», не именем места;
- moodboard не выбирается и не сохраняется;
- registered limit 5/сутки не проверяется;
- saved route из cross-feature wiring не проверяется;
- keyboard test не проверяет form controls/Esc.

Не нужно помещать всё в один длинный test: ранний failure скрывает остальные
шаги, а retry повторяет внешние mutations.

### [Medium] Живая БД делает текстовые селекторы неуникальными

`requests-limit` использует постоянный комментарий. После повторных прогонов
public feed содержит несколько совпадений, и strict locator может упасть.
Каждый mutation-test должен создавать уникальный suffix (`timestamp +
workerIndex/random`) и проверять exact unique content.

### [Medium] `Date.now()` недостаточно для параллельных аккаунтов

Два worker могут получить одинаковый millisecond email. Использовать
`testInfo.workerIndex` + timestamp + random UUID fragment. Пароль и email не
печатать в screenshot/report.

### [Medium] Координатный клик по map хрупок

`click({x: 50, y: 50})` может попасть в Leaflet zoom control или overlay.
Dirty map-ветка уже добавляет кнопку «Сделать стартом» в popup — использовать
её как стабильный role/text selector.

### [Medium] Навигация может обогнать mutation

После favorite/save-route нельзя сразу уходить на другой route. Сначала
дождаться смены доступного имени кнопки или success status, затем переходить.

### [Low] Несемантичные/нестрогие locators

Предпочитать `getByRole`/`getByLabel` и heading level. Например,
`getByText('Кабинет')` может одновременно совпасть с nav и heading;
`getByRole('heading', { name: 'Кабинет' })` стабилен.

## Рекомендуемый набор specs

| Spec | Mutation | Что доказывает |
|---|---:|---|
| `smoke.spec.ts` | нет | приложение стартует, header виден |
| `route-sharing.spec.ts` | нет | 3 места, start, summary и тот же URL в новой вкладке |
| `map-keyboard-nav.spec.ts` | нет | Tab → marker → Enter → popup → toggle |
| `anonymous-place-limit.spec.ts` | да | 1-е место видно как user, 2-е блокируется |
| `anonymous-request-limit.spec.ts` | да | 1-я уникальная заявка видна, 2-я блокируется |
| `cabinet-profile.spec.ts` | да | signup, роль, реальный empty state |
| `registered-cross-feature.spec.ts` | да | favorite → cabinet → moodboard save; route save → cabinet → map URL |
| `registered-limit.spec.ts` | да | для places и requests пять insert проходят, шестой блокируется |

Последний threshold test можно сделать через browser-side Supabase requests с
одной финальной UI-проверкой. Не добавлять `service_role` в Playwright.

## Правила изоляции

1. Каждый spec получает новый context; не добавлять общий `storageState`.
2. Mutation data уникальны и не полагаются на пустую таблицу.
3. Не запускать mutation specs повторно при каждом CSS change. Для design-pass
   достаточно build/lint/unit + smoke/route/keyboard; полный e2e — на design
   checkpoint и перед сдачей.
4. Для CI оставить `reuseExistingServer: false`; локально убедиться, что
   reused server поднят из текущего worktree, иначе возможна проверка старого
   bundle.
5. Reporter хранит trace/screenshot только при failure; перед коммитом
   проверить артефакты на email, tokens и cookies.
6. Не делать cleanup через публичный service key. Для накопительных данных
   использовать уникальные assertions; test-project очищать вручную вне
   acceptance run при необходимости.

## Матрица прогонов

| Checkpoint | Запуск |
|---|---|
| Каждая локальная логическая правка | затронутый Vitest/spec |
| После трёх merge | build + lint + unit + полный e2e |
| Внутри design-pass | build + lint + unit + smoke/route/keyboard |
| Design exit | полный e2e один раз |
| После конкретного breaker fix | regression spec + затронутые unit |
| Финальная сдача | полный suite один раз, затем не менять код |

## Acceptance evidence

В `STATE.md`/`REPORT.md` для каждого claim записать команду, exit code, число
tests и SHA. Для ручных шагов — route, state, viewport и screenshot path. Не
считать видимую кнопку доказательством успешного сохранения: проверяется
результат после reload/на другом экране.
