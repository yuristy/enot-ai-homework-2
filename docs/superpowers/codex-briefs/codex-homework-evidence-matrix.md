# Матрица критериев ДЗ и доказательств

> Снимок до feature integration. Статус «локально» не означает, что материал
> виден проверяющему: он должен быть достижим из опубликованного репозитория.

## Обязательная часть

| Критерий | Статус | Текущее доказательство | До сдачи |
|---|---|---|---|
| Работающий результат | В работе | foundation `main`; три feature-ветки | merge, wiring, design, полный acceptance |
| Параллельные субагенты | Выполнено локально | три feature worktree/ветки и планы | exit SHA, session записи, merge topology |
| Повторяемый workflow | Есть, требует уточнения | `workflow/add-place.md`, `.claude/skills/add-place/SKILL.md` | закрыть gaps из workflow audit |
| README с запуском | Частично | `README.md` запускает foundation | обновить features, tests, ограничения, итоговый SHA/URL |
| Ссылка на репозиторий | Репозиторий есть | `origin` GitHub | push финального main, проверить публичность/доступ |
| PDF | Не применяется | результат — работающее приложение, не текстовый профиль | явно не заявлять PDF как обязательный артефакт |

## Опциональные плюсы

| Пункт | Статус | Evidence |
|---|---|---|
| Три git worktree | Выполнено локально | `feature/map-routes`, `feature/cabinet`, `feature/requests-moodboard` |
| Sandbox isolation | Готово локально | `032b3c1`, `docs/isolation-test-codex.md` |
| Prompt injection, две модели | Готово локально | `030dc8f`, `gpt-5.6-luna/low` vs `gpt-5.6-sol/high` |
| Честный отрицательный результат | Готово локально | обе модели обнаружили injection; ожидаемого контраста не было |
| Vitest | Есть | foundation tests + feature unit tests |
| Playwright | Частично | smoke + map committed; feature/golden specs не завершены |
| frontend-design | Не выполнено | blueprint готов, нужен явный post-merge skill pass и screenshots |
| Независимый аудит | Только preliminary | `40a58a5`; финальный fresh audit нужен после merge |
| Breaker agent | Не выполнено | charter готов, запускать после зелёной интеграции |
| Sessions | Частично | только каноническая session 1; Claude владеет продолжением |
| REPORT | Skeleton | `REPORT.md` | заполнить фактами, SHA, failures, checks |
| Замеры parallel/sequential | Нет | необязательно | не тратить лимит без остатка бюджета |
| Context optimizer/index | Нет | необязательно | сознательно пропустить, если не остаётся бюджета |
| Secret scan | Preliminary | Codex report `3e8b2bf` | повторить на финальном tracked tree/history/screenshots |

## Локальные commits, которые пока не видны через `origin/main`

| SHA | Содержание | Как включить |
|---|---|---|
| `3e8b2bf` | coordination, credit plan, security audit, breaker charter | уже в local main; push после integration |
| `032b3c1` | isolation report | cherry-pick или merge evidence branch |
| `030dc8f` | prompt-injection experiment | cherry-pick вместе с последующими audit commits |
| `cc6815d` | preliminary feature audit | cherry-pick |
| `40a58a5` | sessions ownership handoff | cherry-pick |

Feature commits станут видимы, если ветки merge без squash и финальный main
будет опубликован. Локальные worktree сами по себе проверяющему недоступны.

## Workflow readiness audit

Два workflow-представления совпадают по основной последовательности:
получить вход → геокодировать адрес → проверить радиус 100 м → изменить seed →
обновить README → показать diff/не коммитить без подтверждения.

Gaps, которые нужно закрыть одной короткой правкой обоих файлов:

1. `seed.sql` сейчас является одним multi-row INSERT с `;` в конце. Явно
   определить: добавить новую строку перед `;` либо новый standalone INSERT;
   «дописать строку» сейчас двусмысленно и может создать невалидный SQL.
2. Фото входит во вход, но шаг не говорит записать его в `photo_url` и
   проверить public HTTPS URL. Зафиксировать mapping или `null`.
3. Проверять finite/range координат и принадлежность Москве до изменения SQL.
4. Экранировать apostrophe в name/description и корректно формировать
   PostgreSQL `text[]`; не собирать SQL без просмотра diff.
5. Для Nominatim задать понятный User-Agent и не повторять запросы; при network
   failure остановиться, а не угадывать координаты.
6. После изменения запускать как минимум seed syntax/application check на
   disposable/test project либо документировать, что live apply выполняет
   человек. Затем пересчитать количество строк, а не вручную прибавлять 1.
7. Не коммитить и не применять live DB без подтверждения пользователя — это
   уже есть в skill, но должно быть одинаково явно в копируемом workflow.

Workflow является применимым уже сейчас, поэтому это quality hardening, а не
блокер обязательного критерия. Исправлять оба файла одним commit, чтобы они не
разошлись.

## Финальный checklist проверяющего

- clone по ссылке → команды README действительно поднимают приложение;
- четыре экрана и golden path работают на опубликованном SHA;
- workflow и skill присутствуют и согласованы;
- git history показывает три feature-потока и интеграцию;
- REPORT ссылается на isolation/injection/audit evidence;
- `sessions/STATE.md` не содержит claims без test/screenshot;
- screenshots не содержат email, tokens, browser chrome с аккаунтом;
- `.env.local`, service keys и command history отсутствуют во всех commits;
- final `build`, `lint`, `test`, `test:e2e` зафиксированы после последней правки.

## Оценка готовности

- Функциональная готовность остаётся около 60% до exit checkpoint и merge.
- Полнота ДЗ/evidence после Codex-подготовки — около 70%.
- После merge/wiring/design/golden path ожидается около 90%.
- Финальные fresh audit/breaker, docs, secret scan и push закрывают оставшиеся
  примерно 10%.
