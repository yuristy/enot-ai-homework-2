# Integration rehearsal для Claude

> Read-only снимок текущих committed HEAD на 2026-08-27. Перед реальным merge
> сверить SHA с exit checkpoint; незакоммиченные feature-правки в rehearsal не
> входят.

## Снимок

| Ветка | HEAD | Worktree |
|---|---|---|
| `main` | `3e8b2bf` | clean по tracked-файлам, ahead `origin/main` на 1 |
| `feature/map-routes` | `784b950` | dirty: 6 modified + `app/e2e/dbg.spec.ts` |
| `feature/cabinet` | `9c200ef` | clean, без Tasks 7–8 |
| `feature/requests-moodboard` | `d93e793` | dirty: `useMoodboards.ts`, без Tasks 6–7 |

Общая база трёх feature-веток: `c80c7c1`. После fork в `main` отдельно
появились исправление `policies.sql`, publishable `.env.example` и Codex docs.

## Результат `git merge-tree`

Проверены три пары feature-веток от общей базы:

- map + cabinet: конфликт только `app/src/App.tsx`;
- map + requests/moodboard: конфликт только `app/src/App.tsx`;
- cabinet + requests/moodboard: конфликт только `app/src/App.tsx`;
- `Header.tsx` объединяется автоматически;
- `package.json`, `package-lock.json`, `playwright.config.ts`, `main.tsx`
  меняет только map-ветка;
- `policies.sql` и `.env.example` после fork менял `main`, feature-ветки их не
  меняли, поэтому текущие main-fixes должны сохраниться автоматически.

Вывод: сложного conflict storm не ожидается. Резервировать отдельного дорогого
агента для merge не нужно.

## Экономный порядок реального merge

1. Получить три новых exit SHA и подтвердить чистый status каждого worktree.
2. Проверить, что `dbg.spec.ts` отсутствует в map commit.
3. Merge в порядке map → cabinet → requests/moodboard. Не squash: merge
   topology является доказательством трёх worktree для проверяющего.
4. Не запускать полный suite после каждой ветки. После конфликтов выполнить
   typecheck/build, а полный `build + lint + test + test:e2e` — один раз после
   всех трёх merge.
5. Не принимать `theirs/ours` целиком для `App.tsx`; собрать финальный файл
   вручную из четырёх реальных экранов.

Целевая композиция `App.tsx`:

```tsx
import { Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { AuthProvider } from './features/cabinet/AuthProvider';
import { CabinetScreen } from './features/cabinet/CabinetScreen';
import { MapScreen } from './features/map/MapScreen';
import { MoodboardScreen } from './features/moodboard/MoodboardScreen';
import { RequestsScreen } from './features/requests/RequestsScreen';

export function App() {
  return (
    <AuthProvider>
      <Layout>
        <Routes>
          <Route path="/" element={<MapScreen />} />
          <Route path="/requests" element={<RequestsScreen />} />
          <Route path="/moodboard" element={<MoodboardScreen />} />
          <Route path="/cabinet" element={<CabinetScreen />} />
        </Routes>
      </Layout>
    </AuthProvider>
  );
}
```

После merge проверить `Header.tsx`: четыре `NavLink`, `end` только у `/`, без
дубликатов и placeholder-компонентов.

## Cross-feature шаг сразу после merge

- `FavoriteButton` подключён в popup места.
- `SaveRouteButton` получает start + ordered place ids из готового маршрута.
- После favorite/save дождаться подтверждённого mutation state до навигации.
- Saved route ведёт на `/?start=...&places=...`, не на относительный
  `/cabinet?...`.
- Error states favorite/route/moodboard видимы и не маскируются empty state.

## Условия выхода

- четыре route рендерят реальные экраны;
- нет placeholder и `dbg.spec.ts`;
- main-версии RLS и publishable env сохранены;
- cross-feature actions имеют success/error feedback;
- полный suite зелёный с зафиксированным числом файлов/тестов;
- merge commits и все нужные Codex evidence commits достижимы из финального
  опубликованного `main`.
