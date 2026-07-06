# Wienie — Front-End Dev Notes

Living doc for front-end architecture, design decisions, known issues, and
future ideas. Keep this in the repo alongside `index.html` — it's project
memory, not chat memory.

---

## 1. Stack & Architecture

- **Single-file vanilla HTML/CSS/JS.** No framework, no build step, no
  bundler. Everything lives in one `index.html`.
- **Data**: fetched at runtime from `restaurant_data_normalized.json` and
  `menu_data_normalized.json`, sitting alongside `index.html` on GitHub
  Pages. Not embedded — GitHub Pages serves real HTTPS, so `fetch()` just
  works, unlike a local `file://` double-click.
- **Hosting**: GitHub Pages, `macgruberdataservices.github.io/disney-dining`.
  Deploy is manual upload/push — no CI.
- **PWA shell**: `manifest.json`, icons (`icon-192.png`, `icon-512.png`,
  `apple-touch-icon.png`). `sw.js` is currently a **kill switch**, not a real
  service worker — see §3.
- **Primary target device**: iPhone, tested via Safari standalone
  (Add to Home Screen). Real-device testing has been the standing #1 risk
  since the very first session — this app has repeatedly broken in ways
  that only show up on real iOS Safari, not in code review.
- **Single shared scroll container**: `#main` owns scroll for every view
  (home/browse/menu). Views toggle via `.active` (display swap), not
  independent scroll regions. This was a deliberate structural change (see
  §3 for the sticky-header gotcha it introduced and fixed).
- **Nav model**: `browseStack` is the source of truth for hierarchy
  position (array of `{type, value, label}`). `goBackOneLevel()` is the
  single function both tap (breadcrumb) and swipe-back call — don't
  reimplement back-navigation logic a second time anywhere.

---

## 2. Theming & Design Language

### Brief
"Vintage field guide through a Disney lens" — 1960s-ish National/State Park
guidebook aesthetic. Reference: WED Enterprises, NPS/USFS signage, Junior
Ranger booklets, Golden Books. Explicitly **not** mid-century-modern/Palm
Springs/Mad Men, despite Mid-Century being a live comparison theme for a
while.

Inspiration hit: a real USFS "Entering White Mountain National Forest"
sign — bold uniform-stroke connected script for place names, condensed
bold sans (FHWA Highway Gothic lineage) for the utilitarian caps text.

### Current theme: `parkguide` (the only theme — Mid-Century removed
entirely, see §3)

| Role | Var | Hex | Used for |
|---|---|---|---|
| Forest | `--forest` | `#3B4A32` | Structural chrome — top header, sticky menu-header background |
| Ranger | `--pine` | `#2F5C3F` | Interactive accent — active chips, distance labels, section headers |
| Campfire | `--gold` | `#B5651D` | Highlight/selection, used sparingly — this is the one everyone likes, don't mess with it without a reason |
| Bark | `--ink` | `#2B2620` | Primary text |
| Paper | `--cream` | `#DCD1BB` | Primary background — corrected once already for being accidentally lightened instead of just desaturated, see §3 |
| Sticky header bg | hardcoded `#5A4632` | Bark-brown, deliberately *not* another green — see rationale below |

**Dropped**: "River" (dusty blue), a 4th accent color from the original
design brief. Built once as a mockup, killed on sight — it had no real job
distinct from what Forest/Ranger/Campfire already covered, and a 4th
accent competing for attention would've diluted Campfire, which was the
one color everyone actually responded to. Don't resurrect it without a
concrete use case (something that specifically needs a *cool* color, e.g.
an "open now" state).

**Why the restaurant sticky header is brown, not green**: by the time it
was built, the app already had two greens (Forest + Ranger) fighting for
identity. A third green for a large-field element (not a small-area
accent) would've read as *more* saturated than intended purely from
covering more surface area — same-color-different-area is a real
perception effect, not a hex-picking mistake. Brown ties to the "Bark"
role from the brief and reads as leather/ink-on-paper instead of "which
green is this now."

### Typography
- **Body/UI sans**: Inter.
- **Restaurant names / menu headers**: Fraunces (swapped from Bitter
  mid-project — both are still loaded so a visual A/B is one CSS variable
  away if you ever want to revisit it).
- **Wordmark ("Wienie:")**: Yellowtail — matched specifically against the
  USFS sign reference for uniform-stroke, closed-loop connected script.
  Pacifico was the runner-up, rejected for reading too smooth/modern-
  cursive versus hand-painted.
- **Wordmark tagline sans** ("Follow the Food," since removed from the
  header — see §3): Overpass, chosen because it's the actual open-source
  redraw of FHWA Highway Gothic, not just a similar-looking sans.

### Flat over glass
Early builds used `backdrop-filter: blur()` glass panels throughout
(header, results, filters). Explicitly abandoned for the field-guide
theme — glassmorphism reads modern/digital, the brief calls for
printed/tactile. Mid-Century theme still has its glass; that's the
intentional visual difference between the two, not an oversight.

---

## 3. Known Concerns / Technical Debt

- **RESOLVED 2026-07: water park `area` field bug, fixed in one of four
  places it existed, three times.** Disney's API reports water parks'
  `area` as the surrounding resort zone ("Disney Springs Resort Area"),
  not the actual park (Typhoon Lagoon/Blizzard Beach) — a real data
  quirk, not fixable from our side. Someone fixed it once, correctly, in
  search-results grouping (`twoTierGroupKey`). It silently did NOT apply
  to Browse's area list, Browse's restaurant filtering (which would have
  returned **zero results** on click, not just a wrong label), or the
  shared `locationLabel()` feeding four separate render locations. Fixed
  properly now — one shared `waterParkName()` helper, all four call sites
  route through it. **The actual lesson**: a data-quirk workaround that
  lives inline inside one function instead of as a named, shared helper
  is invisible to every other function touching the same field. If this
  pattern shows up again (a data field that needs correcting before
  display), extract the fix into a named function immediately, don't
  wait until it's already silently regressed three times to notice.

- **RESOLVED 2026-07 (v19): Near Me feature silently reverted by a session
  fork, re-merged.** A parallel chat session was started from an
  `index.html` that predated the Near Me dedicated-view fix (v16-era).
  Real, good work landed in that session (the filter-geometry rework, the
  OS dead-band investigation above) — but since that session's copy never
  had Near Me to begin with, there was no way for it to know to preserve
  it, and the feature quietly disappeared when its output became the new
  base. Not anyone's carelessness — it's the third instance of the exact
  same underlying pattern this doc keeps logging (water-park bug, filter
  geometry, now this): **two independent copies of the same fact will
  drift, whether the "fact" is a data-field workaround, a layout
  measurement, or an entire file.** The process fix: when starting a new
  session to work on this project, always upload the current
  `index.html` fresh rather than assuming a new session already has the
  latest state — chat sessions don't share files with each other.

Real issues, found and in most cases already fixed this project — logged
here so they're documented in one place instead of scattered across chat
history.

- **RESOLVED 2026-07 (v16): filter sheet / results plane geometry drift.**
  The filter card's CSS anchor gained `+ var(--safe-bot)` in one edit while
  `layoutPlanes()` kept computing the results plane's bottom assuming the
  old 8px anchor — result: results content rendering *below* the filter
  card, and the card floating above a cream dead zone. Fixed by making
  geometry a single source of truth: a `filterMetrics()` helper owns peek
  height, max height, and the resolved safe-area pad, and **both**
  `layoutPlanes()` and the drag handler read from it. Same lesson as the
  water-park bug, different domain: **two pieces of code independently
  encoding the same fact (where the filter sheet sits / what an API field
  means) WILL drift — extract the fact into one named place the first
  time two call sites exist, not after it breaks.** Also in this fix:
  - Filter sheet now anchors at `bottom: 0` (flush to the physical screen
    edge — the iOS home indicator floats over content, so this is the
    hard maximum for reclaiming bottom real estate). The safe area became
    *interior* bottom padding on the sheet, so chips clear the indicator.
    Bottom corners squared, top radius kept — it's a sheet now, not a
    floating card. **All height math includes the safe-area pad**; keep
    the `+ safe-bot` terms if touching `--filter-peek-h`/`--filter-max-h`.
  - `layoutPlanes()` positions the results bottom from the filter's
    *target* height (inline drag height → expanded max → peek), never
    `offsetHeight`, which reads a moving value mid-transition.
  - During a live drag, the results plane's `bottom` transition (0.28s)
    is disabled and layout runs synchronously per move event, so the
    results edge tracks the finger instead of trailing it. Restored on
    release so tap-to-expand still animates.
  - Park chips center via auto-margins on first/last chip — NOT
    `justify-content: center`, which clips the left edge of overflowing
    flex content with no way to scroll to it. If chips ever get wrapped
    in another element, the `:first-child`/`:last-child` hooks break;
    re-check centering after any markup change there.
- **`--filter-peek-h: 74px` is the next magic number in line.** It
  currently fits exactly the handle row + one chip row. A chip wrap, a
  font swap, or a padding tweak silently clips the chips at peek. Same
  species as the `27vh` incident and the `scroll-margin-top: 160px` one —
  should eventually be measured from content, not declared.
- **Tap-highlight vs. swipe-gesture conflict — OPEN, not fixed.** Starting
  a swipe on top of a list row flashes that row's `:active` highlight for
  the whole drag. Real fix is cancel-on-movement (kill the highlight once
  touchmove exceeds ~10px), not delay-then-show — delaying punishes every
  ordinary tap to fix a problem that only exists on swipes. Requires new
  touchmove tracking (doesn't exist yet) and moving off CSS `:active` to a
  JS-managed class on every tappable row type in Browse. Deferred as
  bigger-than-trivial scope. Full TODO comment is in the code near
  `setupSwipeBack()` — this entry should stay in sync with that comment,
  not drift from it.
- **Service worker is currently a kill switch, not a real SW.** iOS
  Safari's PWA caching (SW cache + Safari site data + home-screen icon
  cache, three separate layers) made iteration painful enough that we
  deliberately disabled real SW registration during active dev. Do not
  re-enable real offline caching until close to an actual stable/ship
  milestone — it's pure overhead with zero payoff while still iterating on
  layout and behavior.
- ~~Mid-Century theme is suppressed, not deleted, and is quietly rotting.~~
  **RESOLVED 2026-07: Mid-Century removed entirely** — theme block, its
  CSS overrides, the theme-switcher (HTML/CSS/JS, all of it, since a
  switcher with one option left is just dead weight), and the Poppins
  font import all deleted. Not hidden, not commented out — gone. Decision
  was: the color palette had personal appeal, but field guide is
  unambiguously more aligned with what the app is actually trying to be,
  and every session that passed with Mid-Century suppressed-but-alive was
  making a future revival more expensive, not less. If a second theme is
  ever wanted again, it starts fresh — this isn't coming back as-is.
- **`#view-menu`'s CSS is split across two separate rule blocks** (one for
  the swipe-transition properties, one for `display:none`/`.active`) at
  different points in the file. Works fine, cascade handles it, but it's
  untidy and a future edit that "helpfully" consolidates them needs to
  preserve both halves — worth merging properly next time either block is
  touched anyway.
- **Hardcoded magic numbers are a demonstrated real risk, not a
  hypothetical one.** `--filter-max-h: 27vh` was exactly this — an
  arbitrary fraction of viewport height with no relationship to actual
  available space, invisible in code review, obvious on a real device.
  That was found and fixed by accident while chasing a different
  complaint. No systematic audit has been done for other instances of the
  same pattern elsewhere in the CSS.
- **`--safe-top`/`--safe-bot` handling has been fixed in multiple places
  as bugs were found one at a time** (`viewport-fit=cover` missing
  entirely; `#filter-plane`'s `bottom` not matching `#maps-card`'s
  pattern; then the v16 geometry drift above). Worth a deliberate pass
  checking every fixed-position element against the same checklist,
  rather than continuing to find these one screenshot at a time. Note the
  filter sheet now uses a *different* safe-area pattern than `#maps-card`
  (interior padding vs. offset anchor) — that's intentional for the
  bottom sheet, but it means "make it match maps-card" is no longer the
  right instinct for bottom-anchored elements; decide per-element whether
  it should float above the indicator or own the space under it.
- **KNOWN ISSUE, OS-SIDE, TIMEBOXED 2026-07: ~62pt dead band at the
  bottom of the standalone PWA.** iOS launches the home-screen app with
  an internally inconsistent viewport: `window.innerHeight` = screen
  minus the TOP safe inset (812 vs `screen.height` 874 on the test
  device), anchored at the physical top — while simultaneously reporting
  `safe-area-inset-top: 62` and `safe-area-inset-bottom: 34` as if the
  view were full-bleed. The missing 62pt is an iOS-owned strip below the
  web view that **no page CSS can paint** (proven: hot-pink `<html>`
  canvas diagnostic — the band stayed cream). Ruled out with instrumented
  builds (v17d/v17d2 HUD): keyboard-shove residue (ot/sy both 0), stale
  home-screen shell (fresh reinstall, same numbers), the manifest
  (removed entirely, band persisted), and page-side geometry (all metas
  verified correct: `viewport-fit=cover`, `black-translucent`,
  `apple-mobile-web-app-capable`). Conclusion: WebKit/iOS shell bug on
  the current device OS build. **Do not spend more sessions on this.**
  Retest after each iOS update; if a rotation-to-landscape-and-back
  self-corrects it in-session, that further confirms the frame-compute
  bug. The keyboard un-shove handler added in v17 stays as cheap
  insurance against the (real, distinct) shove-residue behavior even
  though it wasn't this bug.
- **Cream background color was corrected once already** for being
  lightened instead of purely desaturated when asked to "pull it back a
  touch" — same-lightness-different-saturation vs. actually-just-lighter
  is an easy mistake to make again on future color tweaks; verify with
  actual RGB values, not just eyeballing it, same as was done that time.

---

- **16 CSS selectors still scoped to `[data-theme="parkguide"]`** even
  though it's now the only theme that exists. Harmless — they work
  correctly since `parkguide` is permanently set on `<body>` — but
  unscoping them to bare class names would be tidier. Not done during the
  Mid-Century removal on purpose: 16 call sites is enough surface area for
  a typo to slip through for zero functional benefit. Low priority,
  cosmetic-only cleanup whenever someone's already in that CSS for another
  reason.

## 4. Future Development Ideas

Not scheduled, not committed — a parking lot, not a roadmap.

- Cancel-on-movement tap-highlight fix (see §3 — the one open item with
  real scope attached).
- Real finger-tracking for swipe-back (content visually follows the drag,
  springs back if not completed) if the current instant-fire/CSS-
  transition version ever feels bad in practice. Explicitly deferred
  once already as bigger-than-warranted for where the project was at.
- Systematic magic-number audit across the CSS — the `27vh` incident
  strongly suggests it's not the only one.
- Possible future direction: a companion website, and/or expanding beyond
  dining data into other park content categories — currently just an
  idea Jason's turning over, not scoped or committed to anything. Worth a
  section of its own here once it's more than a hunch.
- Icon audit pass — Lucide's fine for now for functional UI (tent, compass
  confirmed), but it's a generic modern icon set, not a match for the
  vintage field-guide illustration style. Fine for chrome, wrong tool for
  anything meant to be decorative/thematic.
- Re-enable a real service worker with proper offline support once near a
  ship milestone — see §3, don't do this early.

---

## 5. Version Numbering Scheme

**Rule**: does the change touch DOM structure, JS behavior/logic, or
navigation/data flow? → **full integer** (v9 → v10).
Does it only touch CSS values, copy text, or swap a static asset with
*zero* behavior change? → **decimal** (v10 → v10.1).

"Layout" is not its own category. A pure spacing/padding tweak with no
structural consequence is decimal. Anything that changes how something is
*positioned, measured, or computed* — even if the visible result looks
like "just a layout change" — is a full increment. Tonight's real example:
the `#filter-max-h` fix looked like a spacing fix from the outside: it was
actually a computed-layout/JS-behavior fix, and would be a full increment
under this rule, not a `.X`.

The version number itself has no functional role beyond being a
human-readable marker in `#app-version` — it doesn't affect cache-busting
mechanics (any change to the file is enough for that). Its only job is
letting you glance at the loading screen and know whether what you're
about to test is a coat of paint or a structural change.

**Note on history**: v8.2/v8.3 predate this rule being formalized — they
happened organically, not by this schema. Treat everything from this
point forward as governed by it; don't try to retroactively justify the
early numbers. Also: the filter-geometry rework was initially stamped
"v15.1" before this rule was checked — under the rule it's a full
increment (new positioning model, new measurement helper, layoutPlanes
rewrite), so it ships as **v16**. If a stray "v15.1" build escaped to the
device during testing, that's what it was.
