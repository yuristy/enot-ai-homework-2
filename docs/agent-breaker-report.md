# Agent-breaker report — «Москва в кадре»

**Role:** independent adversarial tester, no inherited context from the implementation sessions (per
`docs/superpowers/plans/2026-08-27-05-integration.md`, Task "Agent-breaker session" — this agent is
deliberately *not* the author, run as a separate agent rather than a fork).

**Date:** 2026-08-28
**Target:** `http://localhost:5202` (`npm run dev -- --port 5202`), Supabase project `eksnsyyiwqarpllrhbhe`
(publishable key from `app/.env.local`, RLS-only backend — no custom server).
**Method:** `claude-in-chrome` browser automation for UI-level attempts, plus direct `curl` against
`$VITE_SUPABASE_URL/rest/v1/*` and `/auth/v1/*` to test whether client-side validation is the *only*
thing standing between a malicious actor and a broken database row (it often was — see findings 1, 6, 7, 8).

Two accounts were used: an anonymous session (browser default) and a registered account
(`agent-breaker-<timestamp>@example.com`, created by upgrading an anonymous session via
`/auth/v1/user`, mirroring exactly what `SignUpForm.tsx` does).

---

## Numbered attempts

### 1. [CRITICAL] `curl` bypass: out-of-range coordinates accepted by the database
**Tried:** `AddPlaceForm` blocks `lat > 90`, `lat < -90`, `lng > 180`, `lng < -180` client-side (see
attempt 3 below — this works correctly in the browser). But `app/supabase/schema.sql`'s `places` table
has **no `CHECK` constraint** on `lat`/`lng` range, and neither `policies.sql`'s RLS policies nor the
`enforce_daily_limit()` trigger validate the values. Posting directly to PostgREST with a valid
(non-anonymous-limited) session token:
```
POST /rest/v1/places
{"name":"CURL Out-of-range coords","lat":999,"lng":-999,"source":"user","created_by":"<uid>"}
```
**Result:** `201 Created`, row `id=34` inserted with `lat=999, lng=-999` — geographically nonsensical
coordinates now live permanently in the same `places` table the map renders from.
**Impact:** the client-side range check in `AddPlaceForm.tsx` is *decorative*, not a real backstop —
exactly the class of bug the task description called out. It happened not to crash Leaflet on this
data (see "did not break" section), but the row is permanently corrupt and would break anything that
does real geo-math on it (e.g. `findNearbyDuplicates`'s haversine call, or a future "distance to me"
feature).
**Severity:** Critical (data integrity, real security-relevant validation bypass, not cosmetic).

### 2. [IMPORTANT] `curl` bypass: empty-string comment on `requests`, visible in the public feed
`RequestForm.tsx` blocks an empty comment via `required` + a manual `.trim()` check (confirmed working
in attempt 14). But `requests.comment` is a plain nullable `text` column with no `CHECK`:
```
POST /rest/v1/requests
{"request_type":"seeking_photographer","place_id":null,"wanted_date":null,"comment":"","author_id":"<uid>"}
```
**Result:** `201 Created`. Reloading `/requests` in the browser showed this row rendered as a blank card
— just "Ищу фотографа" and a date, no body text, indistinguishable from a real (broken) submission,
visible to every visitor of the public feed.
**Severity:** Important — real data-quality/spam-surface bug, publicly visible, not just a database
curiosity.

### 3. Empty add-place form (client-side, UI)
Submitted `AddPlaceForm` with all fields blank. **Blocked**: "Заполните название и корректные
координаты." No request sent. Not a bug.

### 4. Out-of-range coordinates via the UI (`lat=999`, `lng=-999`)
Same message as #3, form did not submit. Confirms the *client-side* validation itself is correct — the
gap is purely server-side (see #1). Not a bug.

### 5. Non-numeric coordinates via the UI (`lat="abc"`, `lng="xyz"`)
Same "Заполните название и корректные координаты." message, blocked by the `Number.isFinite()` check
in `AddPlaceForm.tsx`. Not a bug.

### 6. [IMPORTANT] `curl` bypass: empty `place_ids` array accepted for `routes`
The UI never lets you reach "Сохранить маршрут в кабинет" with zero places selected — `RouteSummary`
(and the button inside it) is only rendered when `selectedPlaces.length > 0` (`MapScreen.tsx` line 79).
But `routes.place_ids` has no `CHECK (array_length(place_ids,1) > 0)`:
```
POST /rest/v1/routes
{"user_id":"<uid>","title":"empty route","start_lat":55.75,"start_lng":37.61,"place_ids":[]}
```
**Result:** `201 Created`. The row later appeared in "Мои маршруты" as a clickable "empty route" card;
clicking it opened the map at `?start=55.75,37.61&places=` with "Выбрано мест: 0" — did **not** crash
(see "did not break"), but a saved "route" with no places is a real, user-visible violation of the
product's own rule ("out-of-order action... saving a route with no places selected" from the task
brief).
**Severity:** Important — the exact scenario the assignment named, real bypass confirmed.

### 7. [IMPORTANT] `curl` bypass: empty `place_ids` array accepted for `moodboards`
Same story for `moodboards.place_ids` — no `CHECK` constraint:
```
POST /rest/v1/moodboards
{"user_id":"<uid>","title":"empty board","place_ids":[]}
```
**Result:** `201 Created`, later visible in "Сохранённые мудборды" as "empty board".
**Severity:** Important — same root cause as #6 (both tables trust the client's array to be non-empty).

### 8. `curl` bypass attempt: spoofing `source="curated"` to escape the daily rate limit — BLOCKED (good defense)
Tried, as a registered user, to `POST /rest/v1/places` with `"source":"curated"` to see whether the
`enforce_daily_limit()` trigger's curated-exemption (`auth.uid() is null`) could be reached from a real
client session:
```
POST /rest/v1/places  {"name":"Spoofed curated","lat":55.7,"lng":37.6,"source":"curated","created_by":"<uid>"}
```
**Result:** `403 Forbidden` — `"new row violates row-level security policy for table \"places\""`. The
`places_insert_authenticated` RLS policy's `source = 'user'` clause caught this exactly as its own code
comment says it's designed to. **Not a bug** — this is the one place where the schema explicitly
defends against a client-side bypass, and it held.

### 9. Duplicate-place warning flow (near-duplicate coordinates), confirm-through
Submitted a new place at `lat=55.7104, lng=37.5566` — 0m from an existing curated place ("Смотровая
площадка Воробьёвы горы"). **First submit:** blocked with "Рядом уже есть: ...Отправьте форму ещё раз,
чтобы добавить всё равно." **Second submit** (same data): succeeded, row `id=32` created (confirmed via
`curl`), form cleared, "Место добавлено." shown. Backing out (changing lat/lng) correctly cleared the
warning. Works exactly as designed. Not a bug.

### 10. Anonymous daily rate limit on `places` (1/day)
After the successful add in #9 (same anonymous session), submitted a second valid place. **Blocked**
with "Дневной лимит исчерпан. Войдите, чтобы добавлять до 5 в день." — clean, specific copy from
`lib/limits.ts`, not a raw Postgres error. Not a bug.

### 11. Malformed email at sign-up
Typed `not-an-email` into the email field. Blocked by native HTML5 `type="email"` validation before any
request fired ("Адрес электронной почты должен содержать символ "@"..."). Not a bug.

### 12. [MINOR] Duplicate email sign-up
Signed up twice with the same email (`agent-breaker-<ts>@example.com`). **Blocked** correctly on the
second attempt: "A user with this email address has already been registered." Functionally correct,
but the message is **in English** inside an otherwise fully Russian UI — an i18n inconsistency, not
proxied/translated by the app. Severity: Minor.

### 13. [MINOR] Wrong password at sign-in
Signed in with the right email, wrong password. Blocked: "Invalid login credentials" — again correct
behavior, but English text in a Russian UI. Severity: Minor (same class as #12).

### 14. Empty comment on the request form (UI)
Left the comment textarea blank, clicked "Опубликовать заявку". Blocked by native `required` +
`RequestForm.tsx`'s manual trim-check: "Заполните это поле." (native) — no request sent. Confirms the
client guard the assignment asked to verify is real. Not a bug (the *bypass* of this same guard via
`curl` is finding #2).

### 15. [MINOR] Extremely long comment (~2,500 characters), no length cap or truncation
Typed a ~2,500-character Russian comment into the request form and submitted. **Accepted** — no client
or DB-side length limit exists on `requests.comment` (`text`, unbounded). The feed then rendered the
entire comment at full length with no `line-clamp`/`max-height`/"show more", so the card occupied the
full page height, pushing every other request off-screen. Severity: Minor — a UX/DoS-lite issue (a
troll could post a 50,000-character comment and make the feed effectively unusable), not a security
bug.

### 16. Rapid double-submit on the request form
Filled a comment, then issued two rapid clicks on "Опубликовать заявку". **Only one row was created** —
`RequestForm.tsx` sets `submitting` state and disables the button (`disabled={submitting}`) for the
duration of the request, so the second click was a no-op. Verified via the feed (single card) — not a
bug. Contrast with findings 19–20 below, where the equivalent guard is *missing*.

### 17. Registered daily rate limit on `requests` (5/day), submitted to the actual boundary
Submitted 5 valid requests in a row as the registered account (spread across earlier attempts:
empty-via-curl, long-comment, rapid-double, "Сабмит 4", "Сабмит 5" — all counted by the trigger since it
counts all of that day's rows regardless of content). The 6th attempt was **blocked**: "Дневной лимит на
сегодня исчерпан — попробуйте завтра." — clean copy, not a stack trace. Not a bug.

### 18. [MINOR] "Мои маршруты" doesn't refresh right after sign-in (stale fetch)
Signed in via the UI (an account that already had a saved route, created via `curl` beforehand). The
"Мои маршруты" section on `/cabinet` showed "Сохранённых маршрутов пока нет." even though `curl`
confirmed the row existed and was selectable under RLS for that exact session. A full page reload of
`/cabinet` immediately showed the route correctly. Root cause: `useMyRoutes.fetchRoutes` runs on mount
keyed off `[session, isAnonymous]`, and the transition from "no session" → "anonymous" → "registered"
during the sign-up/sign-in flow doesn't reliably trigger a fresh, correctly-scoped fetch before render.
Severity: Minor — self-heals on reload, no data loss, but a real, reproducible stale-UI bug a user would
notice ("I just saved a route and it's not here").

### 19. [IMPORTANT] Rapid/duplicate-click on "Сохранить мудборд" creates duplicate rows
Selected 1 favorited place, clicked "Сохранить мудборд" once (succeeded), then clicked it 3 more times
in rapid succession. **Result (`curl`-verified):** 4 separate `moodboards` rows created
(`id=2,3,4,5`), all identical (`place_ids=[14]`), timestamps ~0.5s apart. `MoodboardScreen.tsx`'s Save
button is only `disabled` when `selectedPlaces.length === 0` — there is **no** `submitting`/in-flight
guard like `RequestForm.tsx` has (contrast with finding 16). `useMoodboards.saveMoodboard` has no
dedup or debounce either.
**Severity:** Important — silent, real, reproducible duplicate-row creation from ordinary rapid clicking
(a slow network, or an impatient double-click, would trigger this in production).

### 20. [IMPORTANT] Rapid/duplicate-click on "Сохранить маршрут в кабинет" — same bug
Same test against `SaveRouteButton` (used from `RouteSummary` on the map screen): 3 rapid clicks →
3 separate `routes` rows created (`id=4,5,6`), all identical (`place_ids=[14]`, same start
coordinates), ~0.4–1.2s apart, confirmed via `curl`. `SaveRouteButton.tsx` has no disabled/in-flight
state, and `useMyRoutes.save` has no guard either. The duplicates are directly visible to the user in
"Мои маршруты" (three identical "Маршрут от 28.08.2026" cards).
**Severity:** Important — identical root cause to #19; both "save to cabinet" actions across the app
lack the submit-guard pattern that `AddPlaceForm` and `RequestForm` correctly use.

### 21. Repeated profile save with no role selected
Clicked "Сохранить профиль" 3 times in a row with the "Роль по умолчанию" radios left unset. No error,
no crash, no duplicate rows — `ProfileForm.tsx` calls `.upsert({id: userId, ...})`, and `profiles.id` is
the primary key, so repeated saves correctly collapse into one row regardless of click-spam. Not a bug
(this is the same rapid-fire class of test as #19/#20, but here the code happens to be structurally
immune because of the upsert-by-PK pattern).

---

## Things checked that did NOT break (with what was verified)

- **Empty add-place form** — blocked client-side, verified message text, no network request fired.
- **Out-of-range / non-numeric coordinates via the UI** — blocked client-side for `lat/lng > 180/90`,
  negative values, and non-numeric strings (`"abc"`/`"xyz"`); verified via screenshot + no request sent.
- **Duplicate-warning-then-confirm flow** — verified end to end: warning shown once, second identical
  submit inserts the row (confirmed via `curl` against `/rest/v1/places`).
- **Anonymous daily limit (1/day, `places`)** — triggered for real, verified clean user-facing copy
  (not a raw Postgres error string).
- **Registered daily limit (5/day, `requests`)** — pushed to the actual 6th submission, verified the
  block and its copy.
- **`source="curated"` spoofing via the REST API** — attempted as a registered user; correctly rejected
  with `403` by the `places_insert_authenticated` RLS policy (`source = 'user'` clause holds).
- **Malformed email at sign-up** — native `type="email"` validation blocks it before any request.
- **Duplicate email sign-up** — second attempt correctly rejected (Supabase Auth's own duplicate check).
- **Wrong password sign-in** — correctly rejected, no session granted, no info leak beyond "invalid
  credentials".
- **Empty comment on the request form (UI)** — blocked by `required` + manual trim check; verified no
  request fired (the *server-side absence* of the same check is reported separately as finding #2).
- **Rapid double-submit on the request form** — correctly guarded by `submitting` state; only one row
  created, verified via the feed.
- **Moodboard save with zero places selected (UI)** — the Save button is `disabled` whenever
  `selectedPlaces.length === 0`; clicking it while disabled produces no request and no new row
  (verified via `curl` — moodboard count unchanged after the click).
- **Zero-place route (`?places=`) opened via its share link** — does not crash the map screen; renders
  "Выбрано мест: 0" gracefully, no console errors.
- **Out-of-range-coordinate place (`lat=999,lng=-999`, created via the `curl` bypass in #1) rendered on
  the map** — no console errors, no visual break; Leaflet silently doesn't render a marker for it
  (client-side resilience compensates for the missing server-side constraint, but doesn't excuse it).
- **Repeated profile save with no role, clicked 3x** — no duplicate rows (PK-based upsert), no error.

## Environment note (not a product bug)
During testing, an unrelated second Vite dev server was found already running on `localhost:5201`
(pre-existing process, not started by this session) serving the same app; a few browser-automation
clicks stray-navigated to that port and a handful of blank `chrome://newtab` tabs opened
spontaneously during rapid click sequences. These were treated as noise from the shared test machine,
not app behavior, and closed as encountered. Two "GET /rest/v1/places" requests briefly stayed
`pending` after a burst of test traffic and resolved fine a few seconds later — attributed to the
volume of test requests against Supabase, not an app defect.

---

## Overall assessment

The app is **not fragile at the UI layer** — every form-level guard the assignment asked to probe
(empty required fields, out-of-range/non-numeric coordinates, empty comments, rate limits, duplicate
email, wrong password, rapid double-submit on the request form, zero-selection save buttons) held up
correctly and gave clean, Russian, user-facing copy instead of raw errors.

But the assignment's own hypothesis — "this tests whether RLS/DB constraints are the real backstop or
whether the client validation is the ONLY thing standing between a malicious actor and a broken row" —
turned out to be **true in four places**: coordinate range on `places`, non-empty comment on
`requests`, and non-empty `place_ids` on both `routes` and `moodboards`. None of these have a database
`CHECK` constraint; all four are enforced *only* in React state before the `supabase.from(...).insert()`
call, and all four were trivially bypassed with a single `curl` POST carrying a legitimate session
token. The `source='curated'` guard is the one place a real second lock (RLS) exists, and it held —
proof the pattern is known to the codebase, just not applied consistently to every column that needs it.

Separately, two of the three "save to your cabinet" actions (moodboard, route) are missing the
in-flight/`disabled` submit-guard that a third, structurally similar form (`RequestForm`) has — rapid
clicking silently multiplies rows in the user's own saved data. This is a genuine, reproducible,
real-world-triggerable bug (impatient clicking, slow network, or a flaky double-tap on mobile), not an
edge case.

**Verdict: the app is robust against casual/accidental adversarial input at the UI boundary, but is not
robust against a mildly technical user who opens devtools or a terminal** — the four missing `CHECK`
constraints and the two missing submit-guards are real, fixable, reproducible bugs, not cosmetic
nitpicks.
