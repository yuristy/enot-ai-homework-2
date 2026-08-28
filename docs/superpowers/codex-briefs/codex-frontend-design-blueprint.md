# Frontend-design blueprint: «Москва в видоискателе»

> Подготовлен с применением `frontend-design`. Это pre-merge направление, не
> утверждение, что дизайн уже реализован. Код и screenshots создаются только
> после объединения четырёх экранов.

## Предмет, аудитория, задачи экранов

Продукт — не туристический лендинг, а рабочий инструмент москвича, который
быстро выбирает точки для фотопрогулки.

- Карта: выбрать места и получить понятный маршрут.
- Заявки: быстро просмотреть или опубликовать конкретный запрос на съёмку.
- Кабинет: управлять ролью, избранным и сохранёнными маршрутами.
- Мудборд: собрать визуальную последовательность из любимых мест.

## Визуальная идея

Карта является hero, отдельный маркетинговый hero не нужен. Интерфейс
напоминает спокойный видоискатель городской камеры: холодный дневной фон,
асфальтовый текст, цвет Москвы-реки для навигации и один коралловый маршрут.

Единственная выразительная подпись — четыре тонких focus-corner вокруг карты
и тот же коралловый цвет у polyline/номеров выбранных точек. Остальные
поверхности тихие. Это связано с реальной задачей съёмки и маршрута, а не с
универсальной «красивой карточной» темой.

## Компактные tokens

### Цвет

| Token | Значение | Роль |
|---|---|---|
| `--paper` | `#F3F7F6` | холодный светлый canvas |
| `--ink` | `#17202A` | основной текст/асфальт |
| `--muted` | `#66747C` | вторичный текст |
| `--river` | `#1F7A8C` | ссылки, active nav, focus |
| `--route` | `#F05A47` | маршрут и primary action |
| `--line` | `#CAD8D6` | borders/dividers |

Без декоративных градиентов. На этапе ДЗ оставить осознанный light theme:
OSM tiles и screenshots будут стабильнее, а неполный автоматический dark mode
не удваивает QA. `color-scheme: light` задаётся явно.

### Типографика

- Display/navigation: `Unbounded`, 600 — только название продукта и главные
  заголовки, сдержанно.
- Body/forms: `Manrope Variable`, 400–700.
- Координаты, расстояние, время: `ui-monospace` как utility role.

Шрифты должны быть локально зафиксированы (WOFF2 или pinned Fontsource), а не
загружаться с Google во время screenshots. Проверить Cyrillic subset и
лицензию; не добавлять третью font dependency только ради mono.

Шкала: 12 utility / 14 caption / 16 body / 20 section / 32–40 page title.

### Геометрия

- spacing base 4; основные шаги 8/12/16/24/32/48;
- radius 8 controls, 12 cards, 18 floating route panel;
- border 1px; shadow только у floating map controls;
- content max-width 1280px, gutter 24–32 desktop и 16 mobile;
- tap target минимум 44×44.

## Layout

### Карта desktop

```text
┌ title + short instruction ───────────── filters ┐
│ ┌ focus ───────── live map ───────── focus ┐ │
│ │ markers / start / coral route            │ │
│ └───────────────────────────────────────────┘ │
│ route summary (2/3) │ sticky actions (1/3)   │
│ add-place details/form below, not over map    │
└────────────────────────────────────────────────┘
```

Map height: `clamp(420px, 62vh, 720px)`. Route tray не перекрывает Leaflet
attribution/zoom. На mobile tray становится sticky bottom panel под/поверх
нижней кромки карты с safe-area padding.

### Остальные экраны

```text
Requests:  [page intro + form 5 cols] [feed 7 cols]
Cabinet:   [identity/profile 4 cols]  [favorites/routes 8 cols]
Moodboard: [favorite picker 4 cols]   [live collage 8 cols]
Mobile:    все блоки в одну колонку, primary job идёт первым.
```

Структурные labels называют данные (`3 места`, `4,8 км`, `~95 мин`), а не
используют декоративные `01/02/03`.

## Component direction

- Header: компактный sticky bar, wordmark слева, четыре route справа; active
  link имеет underline/route stroke, не только bold.
- Button: primary coral fill, secondary transparent river border, destructive
  отдельным нейтрально-красным только при реальной destructive action.
- Forms: label сверху, help/error под field; error объясняет следующее действие.
- Card: border + paper surface без одинаковой тяжёлой тени на каждом элементе.
- Map popup: place name, source badge, route/favorite/start actions с
  различимыми accessible names.
- Empty state: конкретный следующий шаг и link/action, без декоративной
  иллюстрации.
- Success/error: одинаковый action vocabulary — «Сохранить маршрут» →
  «Маршрут сохранён».

## Motion и доступность

Одна orchestrated animation: route summary появляется вместе с готовой
polyline за 180–240ms. Остальные hover/focus transitions ≤150ms. При
`prefers-reduced-motion: reduce` отключить transform/route reveal.

- видимый `:focus-visible` 2px `--river` + 2px offset;
- popup закрывается Esc, focus возвращается на marker;
- status/error используют правильные live regions без смены роли одного и
  того же сообщения;
- цвет не является единственным признаком selected/error;
- проверить 200% zoom и keyboard-only.

## Самокритика и принятое уточнение

Первоначальная идея с «фотоплёнкой/contact sheet» для всех карточек была
отброшена: она декоративна, ухудшает плотность forms/feed и могла бы выглядеть
как шаблон фотографического портфолио. Оставлен один функциональный образ —
viewfinder вокруг карты + route stroke. Так визуальная подпись относится к
главной работе продукта и не конкурирует с пользовательскими фотографиями.

## Screenshot matrix без лишних прогонов

Состояние данных фиксируется до первого screenshot и не меняется между
before/after.

| Группа | Viewport | Screens |
|---|---|---|
| Before | 1440×1000 | map route из 3 мест; requests form+feed; registered cabinet; moodboard selection |
| After | 1440×1000 | те же четыре route и состояния |
| Mobile after | 390×844 | те же четыре route, по одному screenshot |

Итого 12 screenshots. Не делать случайные промежуточные снимки. Имена:

```text
sessions/screenshots/before/map-1440.png
sessions/screenshots/before/requests-1440.png
sessions/screenshots/before/cabinet-1440.png
sessions/screenshots/before/moodboard-1440.png
sessions/screenshots/after/map-1440.png
...
sessions/screenshots/after/moodboard-390.png
```

Каждая запись в `STATE.md`: путь, viewport, route, auth/data state и SHA.

## Implementation guardrails

- Сначала удалить неиспользуемый Vite scaffold CSS/assets, затем создать один
  token layer; не наслаивать overrides в конце файла.
- Не переименовывать product actions без одновременного обновления e2e.
- Не менять data-flow и Supabase hooks внутри визуального commit.
- После desktop pass сразу проверить 390px, а не чинить mobile отдельной
  большой волной.
- Exit: build/lint/unit, focused e2e, 12 screenshots, затем один полный e2e.
