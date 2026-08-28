# Отчёт Codex для Claude: параллельный поток до интеграции

## Метаданные

- Дата: 2026-08-27.
- Роль: senior frontend React-разработчик уровня FAANG, опыт финтех/крипто.
- Конфигурация основного потока: `gpt-5.6-luna`, reasoning `low` — выбранная
  ранее экономичная конфигурация достаточна для ограниченного read-only аудита
  и подготовки документации.
- Метод: статический read-only анализ `main`, committed feature-состояний и
  видимых незакоммиченных diff; без изменения `app/` и feature-worktree.

## Выполнено

1. В `codex-results-handoff.md` добавлена стратегия экономии Claude:
   распределение оставшегося бюджета, четыре рекомендуемых пятичасовых окна,
   правило одного интеграционного контроллера, модельная маршрутизация,
   targeted/full test checkpoints и резерв 20%.
2. Подготовлен `codex-breaker-charter.md`: узкий сценарий для будущего
   независимого агента с лимитом времени, stop condition и матрицей auth/RLS,
   concurrency, malformed input, cross-feature и browser проверок.
3. Выполнен предварительный security review RLS, rate limit, клиентских точек
   ввода, route parsing и обработки ошибок.
4. Выполнен secret scan по отслеживаемым файлам и именам чувствительных
   файлов. `app/.env.local` существует локально, игнорируется git и его
   содержимое намеренно не выводилось. В git найден только Supabase
   publishable key из `app/.env.example`; признаков `service_role`, private key
   или типовых provider secrets не найдено. Слово `service_role` встречается
   только в поясняющем комментарии.
5. Дополнительные модельные prompt-injection прогоны не запускались:
   существующий commit `030dc8f` уже содержит одинаковый сценарий на
   `gpt-5.6-luna/low` и `gpt-5.6-sol/high`, дословные ответы и usage. Повтор без
   нового проверяемого вопроса увеличил бы расход, но не закрывал бы новый
   критерий ДЗ.

## Подтверждённые положительные свойства

- RLS включён на всех шести публичных таблицах.
- Owner-only политики для favorites/routes/moodboards проверяют `auth.uid()` и
  запрещают anonymous JWT.
- Клиент не может вставить curated place: policy требует `source = 'user'` и
  `created_by = auth.uid()`; trigger отдельно оставляет curated exemption
  только для вызова без JWT.
- Публичный user text выводится обычными React children; опасные HTML sinks
  (`dangerouslySetInnerHTML`, `innerHTML`, `eval`, `new Function`) не найдены.
- Dirty map-правка уже добавляет finite/range validation координат в форме и
  использует гарантированную session через `ensureSession()`.

## Findings и задания Claude

### [High hypothesis — breaker must reproduce] Дневной лимит может иметь race

- Файл: `app/supabase/policies.sql`, `enforce_daily_limit()`.
- Trigger делает `count(*)`, затем разрешает INSERT. Явного per-user lock,
  atomic counter или serializable retry нет.
- Два параллельных запроса могут увидеть одинаковый count до commit соседа и
  оба пройти границу.
- Не менять SQL вслепую: сначала выполнить параллельный PostgREST test из
  breaker-charter. При подтверждении нужен минимальный атомарный механизм и
  отдельный regression test.

### [Medium] Серверная схема не ограничивает координаты и размеры public input

- Файл: `app/supabase/schema.sql`.
- Нет CHECK для `lat/lng`, длины `places.name`, `description`,
  `requests.comment`, `profiles.display_name`, `routes/moodboards.title`, а
  также cardinality `place_ids`.
- Клиентская валидация формы не защищает прямой PostgREST. Public feed/map
  читают эти значения все пользователи, поэтому это не только self-DoS.
- Перед сдачей определить разумные MVP-границы и добавить DB constraints
  миграционно/идемпотентно; проверить, что seed им соответствует.

### [Medium] Route parser принимает non-finite/out-of-range start

- Файл: `app/src/lib/route.ts`, `parseRouteFromUrl()`.
- Проверяется только `Number.isNaN`; `Infinity`, координаты вне диапазона,
  отрицательные/дублирующиеся id проходят parsing.
- Это недоверенный URL-вход. Добавить finite/range/integer/positive/dedupe
  validation и unit cases; разумно ограничить количество ids.

### [Medium] Ошибки mutations могут выглядеть как успешное действие

- Файлы: `useFavorites`, `useMyRoutes`; committed `useMoodboards` до dirty
  исправления.
- Favorites/routes игнорируют Supabase error; UI не получает failure state.
- Dirty moodboard hook уже ловит ошибки, но `MoodboardScreen` пока их не
  отображает. Это совпадает с предварительным audit commit `40a58a5`.

### [Low] Raw backend error выводится пользователю в некоторых формах

- `AddPlaceForm`, `ProfileForm`, `SignInForm`, `SignUpForm` местами выводят
  `error.message` напрямую.
- Для MVP это прежде всего UX/информационная гигиена. Сопоставить ожидаемые
  ошибки с понятными сообщениями, неизвестную деталь логировать без токенов.

## Не security, но блокирует acceptance

- Cabinet: route link остаётся относительным `/cabinet?...` и ProfileForm не
  гидратирует async profile.
- Requests: второй `useRequests` создаёт лишние fetch.
- Map: `app/e2e/dbg.spec.ts` остаётся временным и не должен попасть в commit.
- Requests/moodboard: dirty error state должен быть подключён к экрану.

Полные обоснования этих пунктов уже находятся в commit `40a58a5`.

## Рекомендуемый triage без лишнего расхода

До feature checkpoint исправить только уже известные branch-local blockers.
После merge одним контроллером закрыть route parsing и mutation feedback.
DB constraints и concurrency fix выполнять после воспроизведения breaker,
чтобы не раздувать SQL без доказательства. Full suite не повторять между
каждым из этих read-only findings; запускать на checkpoint, после merge и в
финале.

## Что должен перенести Claude

- Этот отчёт и charter находятся в основном worktree рядом с исходным
  Codex-брифом и должны попасть в опубликованную историю.
- В `sessions/` Claude кратко отражает: модель/reasoning, read-only scope,
  результаты secret scan, findings и решение по каждому finding.
- После merge заменить branch/file snapshot актуальными line references и
  пометить каждую hypothesis как confirmed/rejected.
- Канонический финальный breaker-report создаёт breaker-агент; этот документ
  не выдавать за независимый post-merge аудит.

## Дополнение: integration-readiness pack

После первого security/handoff блока выполнены ещё четыре read-only задачи.

### Merge rehearsal

`git merge-tree` запущен для map/cabinet, map/requests и cabinet/requests от
общей базы `c80c7c1`. Во всех трёх парах единственный конфликт —
`app/src/App.tsx`; `Header.tsx` auto-merges, dependency/Playwright файлы
изменяет только map. Поздние main-fixes `policies.sql`/`.env.example`
feature-ветками не затронуты.

### Playwright audit

Обнаружены: нестабильное ожидание ровно 12 markers на живой БД, неполное
покрытие spec §14, неуникальные mutation data, слабые heading-only assertions,
координатный клик рядом с Leaflet controls и риск навигации до завершения
mutation. Подготовлен focused suite вместо одного длинного stateful test.

### Frontend design

Скилл `frontend-design` использован для направления «Москва в видоискателе»:
map-as-hero, холодная дневная palette, коралловый route, локальные Cyrillic
fonts, один signature element вокруг карты, desktop/mobile layouts,
accessibility/reduced-motion и фиксированная матрица из 12 screenshots.

### Rubric/workflow

Сопоставлены обязательные и опциональные критерии ДЗ с локальными SHA и
publishing status. Workflow и skill совпадают по основной процедуре, но перед
сдачей стоит синхронно уточнить способ редактирования multi-row seed, mapping
`photo_url`, coordinate/SQL validation, Nominatim failure и verification step.

Артефакты перечислены в нижнем разделе `codex-results-handoff.md`. Код,
canonical sessions и финальные документы Claude не изменялись.
