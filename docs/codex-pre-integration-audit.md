# Предварительный read-only аудит feature-веток

> Накопительный отчёт для Claude. Это снимок незавершённой параллельной
> работы, а не финальный независимый аудит после merge.

## Ограничения

- Feature-worktree и `app/` просматриваются только на чтение.
- Никакие исправления, форматирование, test runs или staging в чужих ветках
  не выполняются.
- Незакоммиченные изменения считаются работой Claude in progress, а не
  окончательным решением.
- Финальный аудит из integration-плана всё равно должен выполняться после
  объединения веток отдельным агентом.

## Исходный снимок

| Ветка | HEAD | Рабочее дерево |
|---|---|---|
| `feature/map-routes` | `784b950` | dirty: 6 modified + `app/e2e/dbg.spec.ts` |
| `feature/cabinet` | `9c200ef` | clean |
| `feature/requests-moodboard` | `d93e793` | dirty: `app/src/features/moodboard/useMoodboards.ts` |

## Журнал

### 2026-08-27 — начало аудита

- Зафиксированы HEAD и status трёх worktree.
- Подтверждено, что integration-план пока заблокирован незавершёнными
  рабочими деревьями.

### 2026-08-27 — просмотр незакоммиченных diff

- Map-ветка дорабатывает валидацию координат, получение сессии, локальный
  refetch списка мест, выбор старта из popup и e2e-сценарии.
- Requests-ветка добавляет error state в `useMoodboards`.
- В map-worktree обнаружен временный `app/e2e/dbg.spec.ts` с диагностическими
  `console.log`; это не финальный тест.

### 2026-08-27 — проверка committed-состояния

- Проверены ключевые consumers и точки будущей композиции:
  `AuthProvider`, профиль, избранное, сохранённые маршруты, заявки и
  мудборды.
- Сопоставлены фактические файлы/коммиты с feature-планами и integration-планом.

## Findings

### [High] Ссылка сохранённого маршрута остаётся на странице кабинета

- Файл: `app/src/features/cabinet/MyRoutesList.tsx:16`
- `buildRouteUrl()` возвращает только query string вида `?start=...&places=...`.
- Относительный `href` со страницы `/cabinet` откроет
  `/cabinet?start=...&places=...`. Компонент карты не смонтируется, поэтому
  сохранённый маршрут фактически не откроется.
- Перед exit checkpoint ссылка должна явно вести на pathname `/` с этим
  search, желательно через router `Link`.

### [High] Асинхронно загруженный профиль не гидратирует ProfileForm

- Файл: `app/src/features/cabinet/ProfileForm.tsx:11-14`
- `role` и `displayName` инициализируются из `profile` только при первом
  mount. `AuthProvider` получает профиль асинхронно, поэтому форма может
  смонтироваться с `profile = null` и остаться пустой после прихода данных.
- Для существующего пользователя это показывает неверное состояние и создаёт
  риск перезаписать профиль пустыми значениями.
- Нужна явная loading/hydration-модель либо аккуратная синхронизация локального
  draft при смене profile без перезаписи пользовательского ввода.

### [Medium] Новый moodboard error state пока не виден пользователю

- Файлы:
  - `app/src/features/moodboard/useMoodboards.ts:34,49-55,73-80,101-108`
  - `app/src/features/moodboard/MoodboardScreen.tsx:8-18`
- Dirty-hook возвращает `error`, но экран его не destructure и не отображает.
  Ошибка загрузки избранного может выглядеть как «Сначала добавьте что-то в
  избранное», а ошибка сохранения остаётся полностью без обратной связи.
- Перед коммитом WIP нужно довести consumer вместе с hook.

### [Medium] Записи избранного и маршрутов игнорируют ошибки Supabase

- Файлы:
  - `app/src/features/cabinet/useFavorites.ts:64-71`
  - `app/src/features/cabinet/useMyRoutes.ts:49-58`
- Результаты insert/delete не проверяются; после ошибки выполняется refetch,
  а UI не сообщает, что действие не состоялось.
- Это особенно важно для будущего golden path: кнопка может быть нажата,
  но пользователь не получит подтверждения либо ошибки.

### [Low] RequestForm создаёт второй экземпляр useRequests

- Файлы:
  - `app/src/features/requests/RequestsScreen.tsx:6-15`
  - `app/src/features/requests/RequestForm.tsx:7-30`
- Экран уже вызывает `useRequests`, затем форма вызывает тот же hook ещё раз.
  Это даёт лишний fetch при mount; успешный create делает fetch во внутреннем
  hook и затем ещё один через parent `onCreated`.
- Не блокирует MVP, но перед интеграцией лучше передать create-action из
  родительского hook или разделить query и mutation.

## Блокеры integration readiness

1. `feature/map-routes`: прошлый commit `784b950` сообщает о зелёном exit
   checkpoint, но после него есть 6 modified-файлов и debug-spec. Полный suite
   и новый checkpoint должны подтвердить уже текущее состояние.
2. `feature/cabinet`: worktree clean, но фактически завершён только Task 6.
   В дереве нет cabinet e2e из Task 7 и нет exit-checkpoint commit Task 8.
3. `feature/requests-moodboard`: отсутствуют e2e Task 6 и exit checkpoint
   Task 7; текущая error-handling правка не закоммичена.
4. Merge, cross-branch composition, `frontend-design` и golden path нельзя
   начинать до закрытия этих трёх пунктов.

## Рекомендованный порядок для Claude

1. Завершить текущий map WIP, удалить или не добавлять `dbg.spec.ts`,
   прогнать полный suite и создать новый checkpoint.
2. Исправить ссылку маршрута и hydration профиля в cabinet, добавить
   предусмотренный e2e и exit checkpoint.
3. Довести отображение moodboard errors, добавить предусмотренный e2e и
   exit checkpoint.
4. Только после трёх чистых веток переходить к integration-плану.

## Handoff: владелец sessions

Канонический каталог `sessions/` на этапе интеграции ведёт Claude как
главный контроллер. Codex не изменяет `sessions/STATE.md`,
`sessions/TOOLS.md` и `sessions/session-N.md` в параллельной ветке,
чтобы не создавать конфликтующие версии истории и текущего состояния.

После переноса Codex-коммитов в итоговую ветку Claude должен отразить их в
следующем доступном `sessions/session-N.md`, дополняемом
`sessions/TOOLS.md` и актуальном `sessions/STATE.md`:

| SHA | Материал |
|---|---|
| `032b3c1` | Демонстрация sandbox isolation |
| `030dc8f` | Prompt-injection: `gpt-5.6-luna/low` против `gpt-5.6-sol/high` |
| `cc6815d` | Предварительный read-only аудит feature-веток |

Источники доказательств:

- `docs/isolation-test-codex.md`;
- `docs/prompt-injection-test-codex.md`;
- `docs/codex-pre-integration-audit.md`.

В `sessions/` достаточно сослаться на эти документы и указать ветки, SHA,
модели, reasoning, CLI-режим и честные результаты; полный дословный вывод
дублировать не требуется.

Перед финальной интеграцией Claude также проверяет, что каждый из трёх
feature-контроллеров обновил session-журнал на своём exit checkpoint.
`feature/cabinet` и `feature/requests-moodboard` на момент этого снимка
до exit checkpoint ещё не дошли.
