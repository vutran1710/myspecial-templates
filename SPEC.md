# Theme Bundle Spec — v1.0 (draft)

Status: **Draft v1.0** · Owner: MySpecial · Last updated: 2026-10-25

> This is the public theme format. A theme that follows it passes the same checks the MySpecial platform runs on every upload (`node tools/myspecial-theme.mjs validate`).
Security & processing: the platform security spec · E2E validation: the platform validation pipeline

A **theme bundle is a single HTML file containing only a `<body>` element**: the design of the **gift-picking page**, with **slots** where the page engine puts the real gifts, names and message. It contains **no JavaScript** and **no references to anything outside itself**. Fonts, images and music are embedded in the file.

```
theme.html (<body> only) ──(upload)──▶ validate & sanitize ──▶ stored theme
                                                                 │
occasion data (gifts, message, locale) ──────────────────────────┤
                                                                 ▼
     backend page engine: doctype + <head> + theme body (slots filled) + engine screens + footer + scripts
                                                                 ▼
                                      static page at myspecial.com/{user}/{occasion-slug}
```

| Source | Who makes it | Trust |
|---|---|---|
| **Official** | MySpecial, in the public templates repo: `official/<id>/theme.html` | Reviewed in PR, but goes through the same pipeline |
| **Community** | Anyone, by pull request to the templates repo: `community/<github-user>/<id>/theme.html` | Untrusted. Maintainer review + the same pipeline |
| **Custom** | A giver uploads a `.html`, or uses "Customize" on a built-in in the app | **Untrusted**, processed per the platform security spec |

Official and community themes have no extra powers. They use the same format, validator and tests as giver uploads.

---

## 1. Goals and non-goals

**Goals**
- One file a designer can open directly in a browser and see a realistic sample page (browsers add the missing `<html>`/`<head>` themselves).
- The theme is **only content and style**. Everything structural or executable (doctype, `<head>`, meta tags, scripts, engine UI, footer) is added by the backend.
- A strict, checkable structure, so every accepted theme works with any occasion.
- Safe by construction: no script, no outside requests, nothing that can phish or track.

**Non-goals (v1)**
- Theming the engine screens beyond colors and fonts (§9).
- Any JavaScript in themes, now or via a "trusted" tier.
- A public theme marketplace.

---

## 2. Hard rules

1. **One file, one `<body>`.** The upload is exactly one UTF-8 `.html` file, ≤ 5 MB, containing **exactly one `<body>…</body>` element and nothing else**: no doctype, no `<html>`, no `<head>`, nothing before or after it except whitespace. No zip, no other files.
2. **No JavaScript.** No `<script>` of any type (including JSON or modules), no `on*` attributes, no `javascript:` URLs, no `<noscript>`.
3. **Nothing from outside but images.** Scripts, stylesheets, fonts and audio stay in the file: fonts and audio embedded as `data:` URIs of an allowed type (§10). Images may be embedded the same way **or come from the web over `https:`** (`<img src>`, CSS `url()`); `http:`, `blob:`, `file:`, protocol-relative and root-relative URLs are refused. No `<link>`, `<base>` or `@import`; no font services or CDNs. Named font families are the device's to provide: any `font-family` stack is allowed, and a stack of named families with no generic family at the end is noted (`font.no_fallback`).
4. **Static.** No forms, inputs, buttons, links, iframes, video or other interactive or embedding elements. All interaction is added by the engine at the slots (§6).
5. **Bound by attribute.** The slots and the gift list in §6 are found by their `data-ms-*` attributes, on elements of the author's choice (only the image slots are `<img>`). How the page is built around them (which elements, in what order, how many `<style>` elements) is the author's.

Breaking any rule **rejects** the upload with line and column. Nothing is silently stripped. Notes (warnings: contrast, a font without a fallback, a title below the first screen) go to the giver's Sent-in card and never reject.

---

## 3. File skeleton

```html
<body data-ms-spec="1.0" data-ms-id="rose-garden" data-ms-name="Rose Garden" data-ms-version="1.2.0">
  <style>
    @font-face { font-family: "Rose Script"; src: url(data:font/woff2;base64,…) format("woff2"); }
    body { --ms-color-bg: #FFF1F4; --ms-color-accent: #C2255C; /* tokens §5 */
           background: var(--ms-color-bg); }
    /* the rest of the theme's CSS (§7) */
  </style>

  <!-- page slots (§6.2), decorative markup, and exactly one gift list (§6.3) -->
</body>
```

- `<body>` carries only the metadata attributes in §4. No `class`, `style`, `id` or other attributes on it.
- `<style>` elements may appear anywhere in the body, any number; their CSS is processed in document order, so a token declared later wins. A `<style>` carries no attribute but `type`.
- The rest is the theme content. At publish, the engine moves the content into its own wrapper, `<div data-ms-theme>`, which is the **theme root**.

What the backend adds at publish (never in the theme):

```html
<!doctype html>
<html lang="vi">                                   <!-- page locale -->
<head>
  <meta charset="utf-8"> <meta name="viewport" …> <title>…</title> <meta name="robots" content="noindex">
  <link rel="stylesheet" href="…/engine.css"> <link rel="stylesheet" href="…/t/<themeHash>/theme.css">
</head>
<body>
  <div data-ms-engine="locked|intro">…</div>        <!-- engine screens -->
  <div data-ms-theme>…theme body content, slots filled…</div>
  <div data-ms-engine="pick-bar">…</div> <div data-ms-engine="confirm">…</div>
  <footer data-ms-engine="footer">…</footer>
  <script src="…/runtime.<hash>.js" defer></script>
</body>
</html>
```

---

## 4. Metadata (attributes on `<body>`)

| Attribute | Required | Value |
|---|---|---|
| `data-ms-spec` | ✔ | `1.0` |
| `data-ms-id` | ✔ | `[a-z0-9-]{3,40}`, unique per owner |
| `data-ms-name` | ✔ | ≤ 40 chars, plain text |
| `data-ms-version` | ✔ | semver; must increase on each upload of the same id |
| `data-ms-author` | | ≤ 40 chars |
| `data-ms-description` | | ≤ 160 chars |
| `data-ms-effects` | | e.g. `intro=unwrap; ambient=petals:low; pick=confetti` (§8) |
| `data-ms-option-<key>` | | giver option, e.g. `type=color; default=#C2255C; label=Accent; label.vi=Màu nhấn` (§8) |

Unknown `data-ms-*` attributes on `<body>` are an error, so typos are caught early. Values are plain text: control and bidi-override characters are rejected.

---

## 5. Tokens

Declared as CSS custom properties with literal values in a `body { … }` rule of the theme's `<style>`. At upload they're extracted; at publish the engine puts them on `:root` so it can style **its own screens** (intro, locked, confirm sheet, pick bar, picked, footer), so the whole page matches the theme. Missing tokens use the defaults below.

| CSS variable | Type | Default |
|---|---|---|
| `--ms-color-bg` | color | `#FFF1F4` |
| `--ms-color-surface` | color | `#FFFFFF` |
| `--ms-color-ink` | color | `#3A1027` |
| `--ms-color-muted` | color | `#6E3A52` |
| `--ms-color-line` | color | `#F3D3DE` |
| `--ms-color-soft` | color | `#F7C6D9` |
| `--ms-color-accent` | color | `#C2255C` |
| `--ms-color-on-accent` | color | `#FFFFFF` |
| `--ms-font-display` | font stack (embedded families only) | engine default |
| `--ms-font-display-style` | `normal \| italic` | `normal` |
| `--ms-font-body` | font stack (embedded families only) | engine default (Inter) |
| `--ms-radius-card` | length | `20px` |
| `--ms-radius-button` | length | `999px` |
| `--ms-ground` | `plain \| paper \| wrap` | none (= `plain`) |

Token values must be literal (no `var()` chains, no `url()`).

`--ms-ground` is optional and has no default. It picks what the engine draws behind **every** screen of her page: `plain` the `--ms-color-bg` colour, `paper` the house rice paper, `wrap` the house wrapping paper with blossoms. A theme that uses `paper` or `wrap` leaves its own root transparent so the ground shows through. Rice paper uses `wrap`.

**Contrast** is noted as `token.contrast` when it falls short, never refused: `ink` and `muted` on `bg` and `surface` ≥ 4.5:1; `on-accent` on `accent` ≥ 4.5:1; `accent` on `bg` ≥ 3:1. One exception comes from the browser check, not the tokens: the engine draws its own Report link in the theme's colours, and a paper whose colours leave it under 3:1 is refused (LAYOUT-04), since that link must stay readable on every page.

---

## 6. Structure and slots

A **slot** is an element marked with `data-ms-slot="<name>"`. The theme's content inside it is **sample content**: it shows when the file is opened on its own, and is **replaced** with real data at publish. Slots are filled with DOM operations (text nodes and attributes), never string templating, so data can never inject markup.

### 6.1 Required structure

| Rule | |
|---|---|
| R1 | The file is a single `<body>` (hard rule 1) with only §4 attributes; `<style>` elements anywhere, any number |
| R2 | Exactly one `title` slot, on any element that can hold text. The engine makes it the page's level-1 heading (`role="heading" aria-level="1"` when it is not an `h1`) |
| R3 | Exactly one gift list `[data-ms-gift-list]`, anywhere |
| R4 | The gift list's **direct children** include ≥ 1 `[data-ms-gift]`. The **first** one is the **gift template**; the others are samples, removed at publish |
| R5 | No `[data-ms-gift]` outside the gift list; no gifts nested in gifts |
| R6 | The gift template contains exactly one `gift-name` and one `gift-image` slot, and at most one `gift-note` slot |
| R7 | Page slots (§6.2) appear at most once each, outside the gift list. Gift slots (§6.3) appear only inside a gift |
| R8 | Every `data-ms-*` attribute and slot name is from this spec; unknown ones are errors |
| R9 | The image slots (`cover`, `gift-image`) are `<img>`; the `message` slot is a flow container (it receives `<p>` lines). Every other slot, the gift list and the gifts sit on any element that can hold content (not `img`, `br`, `hr`, `wbr`, `audio`, `svg`, nor a table's structure: `table thead tbody tfoot tr colgroup col`) |

### 6.2 Page slots

| Slot | Required | Element | Filled with |
|---|---|---|---|
| `title` | ✔ | any | Occasion title (text). The engine adds `role="heading" aria-level="1"` unless it is an `h1` |
| `dedication` | ✔ | any | Localized line, e.g. "For Linh, from Vu" / "Gửi Linh, từ Vu" |
| `message` | | a flow container (`div section article aside main figure figcaption blockquote li dd td th header footer nav address`) | Giver's message: one `<p>` per line |
| `cover` | | `img` | Giver's cover photo (`src`, `srcset`, `sizes`, `alt`, `width`, `height`) |
| `recipient-name` | | any | Her name (text) |
| `giver-name` | | any | Giver's display name (text) |
| `occasion-date` | | any | Date in the page locale (`Nov 2, 2026` / `02/11/2026`); a `time` also gets `datetime` |

### 6.3 Gift list and gift slots

```html
<ul data-ms-gift-list>
  <li data-ms-gift>                                   <!-- gift template (first) -->
    <img data-ms-slot="gift-image" alt="" src="data:image/webp;base64,…">
    <h3 data-ms-slot="gift-name">Pottery class for two</h3>
    <p data-ms-slot="gift-note">You keep sending me those videos.</p>
  </li>
  <li data-ms-gift>…sample, removed at publish…</li>
</ul>
```

| Element | Allowed tags | At publish |
|---|---|---|
| `[data-ms-gift-list]` | any container | Gets `role="radiogroup"` (pick limit 1) or `role="group"` |
| `[data-ms-gift]` | any container | Cloned once per gift. Becomes the control: `role="radio"`/`"checkbox"`, `tabindex`, `aria-checked`, `aria-labelledby` → its `gift-name`; keyboard handled by the engine runtime |
| `gift-image` | `img` | Gift photo (`src`, `srcset`, `sizes`, `alt`, `width`, `height`) |
| `gift-name` | any | Gift name (text) |
| `gift-note` | any | Giver's note (text) |

### 6.4 Optional content: `data-ms-if`

`data-ms-if="<slot>"` on any element removes that element when the slot has no data (for example, no message or no cover):

```html
<figure data-ms-if="cover"><img data-ms-slot="cover" alt=""></figure>
<blockquote data-ms-if="gift-note" …>   <!-- inside the gift template: per gift -->
```

If an optional slot has no data and isn't wrapped, the slot element itself is removed.

### 6.5 Localized copy: `data-ms-text`

Literal text in the theme is shown **as-is in every language**. For UI copy, use engine strings:

| Key | en | vi |
|---|---|---|
| `pick-heading` | Choose the one you want most | Chọn món em thích nhất |
| `pick-hint` | No prices here. Choose with your heart. | Không có giá ở đây. Hãy chọn bằng trái tim. |
| `pick-limit` | You can choose {n} | Em được chọn {n} món |

```html
<h2 data-ms-text="pick-heading" data-ms-text-vi="Em thích món nào nhất?">Choose the one you want most</h2>
```

`data-ms-text-en` / `data-ms-text-vi` (≤ 120 chars) override the engine string per locale.

In secret and shuffle modes the engine draws the gift game itself (§9): the gift list and every `data-ms-text` element are removed from the theme; the game section has its own headings. The validator **warns** about literal text longer than 20 characters outside slots and `data-ms-text`, since it won't be translated.

### 6.6 Selection styling

Themes style states with CSS only:

```css
[data-ms-gift][aria-checked="true"] { outline: 3px solid var(--ms-color-accent); }
[data-ms-gift]:focus-visible { outline: 3px solid var(--ms-color-ink); outline-offset: 3px; }
[data-ms-gift][aria-disabled="true"] { opacity: .5; }   /* limit reached */
```

---

## 7. CSS

Parsed with a real CSS parser and rewritten:

- **Source:** every `<style>` in the body, in document order, and `style=""` attributes.
- **Scoping:** `body` selectors are rewritten to `[data-ms-theme]` (the theme root), so `body { background: … }` works both locally and when published. Every other selector is prefixed with `[data-ms-theme] `. Rules on `html`, `:root`, `head`, `*` at top level or `[data-ms-engine]` are rejected.
- **Layering:** output goes into `@layer theme`. Engine UI is outside the theme root and unlayered, so it can't be targeted or overridden.
- **Inline styles** are moved into the stylesheet as hashed classes, so the published page has no inline styles.
- **Allowed:** selectors, `@media`, `@supports`, `@keyframes`, `@font-face` (embedded `src` only), custom properties, animations, transitions.
- **Reserved names:** class, id and `@keyframes` names starting with `ms-` belong to the page engine and the MySpecial Paper kit. A theme using one is rejected (`css.reserved_name` in CSS, `html.reserved_name` in markup).
- **Plain names:** a `@keyframes` name is a plain identifier, without escapes or quotes (`css.keyframes_name`). A selector cannot start with a combinator (`~ *`, `> p`).
- **Attribute selectors** may test only what the paper itself put there, the states the engine sets on a gift, and the giver's options: `class id lang dir role hidden title alt aria-checked aria-disabled aria-selected aria-expanded aria-hidden data-ms-gift data-ms-gift-list data-ms-slot data-ms-if data-ms-text data-ms-opt-*`. What the engine puts on the page for itself (`data-ms-page-id`, `data-ms-gift-id`, `data-ms-screen`, …) cannot be tested (`css.selector_not_allowed`): with images from the web allowed, a rule that tested such a value and set a background would report it to the image host.
- **Fonts:** any `font-family` stack. Embedded families are checked (§10); a named family that is not embedded is the device's to provide, and a stack of those with no generic family at the end is noted (`font.no_fallback`).
- **Rejected:** `@import`, `@namespace`, `@charset`; `url()` other than an embedded `data:` URI of an allowed type or an `https:` image (`http:` is `ref.insecure`); `local()`; `expression()`, `behavior`, `-moz-binding`; `position: fixed`; `content:` longer than 40 characters.
- **Limits** (over every `<style>` together): ≤ 200 KB of CSS excluding embedded data; ≤ 2 000 rules; ≤ 6 `@font-face`; nesting ≤ 10; ≤ 6 compound parts per selector.

---

## 8. Effects, music and options

**Effects** are engine-provided and declared in `data-ms-effects` on `<body>`. They follow `prefers-reduced-motion`.

| Key | Values |
|---|---|
| `intro` | `none` · `fade` · `unwrap` · `envelope` · `curtain` |
| `ambient` | `none` · `petals` · `hearts` · `snow` · `sparkle` · `stars`, with `:low` / `:medium` density |
| `pick` | `none` · `confetti` · `hearts-burst` · `glow` |

**Music:** one `<audio data-ms-music src="data:audio/mpeg;base64,…"></audio>` anywhere in the theme content. No `autoplay`, `controls` or `loop` attributes. The engine adds a play/pause toggle; nothing ever autoplays.

**Giver options** (`data-ms-option-<key>` on `<body>`, max 12) show up in the giver's Theme screen:

| `type` | Fields | Exposed to CSS as |
|---|---|---|
| `color` | `default`, `label`, `label.vi` | `--ms-opt-<key>` (contrast re-checked on save) |
| `boolean` | `default`, `label`, `label.vi` | class `ms-opt-<key>` on the theme root when true |
| `enum` | `choices=a\|b\|c`, `default`, `label`, `label.vi` | `data-ms-opt-<key>="<value>"` on the theme root |

---

## 9. Engine screens

The theme defines **only the pick page**. The engine owns and renders the rest, drawn with the MySpecial Paper kit in the theme's tokens (§5) and embedded fonts; `--ms-ground` picks the ground behind every screen:

| Screen / UI | Notes |
|---|---|
| Locked | Countdown. The locked build contains **no gift data** at all |
| Intro | Opening screen with the `intro` effect, then shows the theme's pick page |
| Pick bar | Sticky at the bottom: selection summary + "This one, please" |
| Confirm sheet | "You can't change it after" (picks are final) |
| Picked | Shows the confirmed gift(s); shown on every later visit |
| Footer | "A page from @vu · Made with MySpecial" + "Report this page" |
| Game (secret / shuffle) | Engine-drawn after the theme frame: the sealed envelope (secret), the table of boxes (shuffle). Replaces the gift list and the theme's pick texts |
| Closed | "Return to sender" (410) once the day is over or the page was cancelled. No theme: the house paper |

Themes can't style these beyond tokens and can't cover them (enforced by the tests in the validation pipeline).

---

## 10. Embedded assets and limits

| Kind | Allowed `data:` types | Per asset (decoded) | Where |
|---|---|---|---|
| Images | `image/webp`, `image/avif`, `image/png`, `image/jpeg`, `image/gif`, `image/svg+xml` | 2 MB, ≤ 4096×4096 | `<img src>`, CSS `url()` |
| Fonts | `font/woff2`, `font/woff`, `font/ttf`, `font/otf` | 500 KB | `@font-face src` |
| Audio | `audio/mpeg` | 3 MB | `<audio data-ms-music>` |

| Whole file | Limit |
|---|---|
| File size | ≤ 5 MB |
| Embedded assets | ≤ 40 (identical ones count once) |
| Fonts | ≤ 6 faces |
| DOM | ≤ 3 000 elements, depth ≤ 32 |

- **Images from the web:** `<img src="https://…">` and CSS `url(https://…)` are kept as they are and loaded by her browser (her page's policy allows `img-src https:`). The image host then sees when, and from where, she opens the page, and, where a rule ties an image to a gift's state, which gift she tapped; it can also change the picture after the paper was checked. The browser check stands in a 2000×1500 picture for every web image, so an unsized one that would push a phone sideways is caught. `http:` is refused (`ref.insecure`).
- Embedded data must be base64 and match its declared type by magic bytes.
- At upload, every embedded asset is **extracted**, sanitized, re-encoded and stored as a separate file on the user-content domain. The published page references those files and **never contains `data:` URIs**.
- Sample content inside slots (e.g. sample gift photos) is used only for the validator's preview, never published.
- **Glyph coverage:** every embedded font must cover Latin + Vietnamese (`U+0102–0103, U+0110–0111, U+0128–0129, U+0168–0169, U+01A0–01A1, U+01AF–01B0, U+1EA0–1EF9`), or the upload is rejected with the missing characters listed. Fonts are checked **per family** (all faces of a family together). The currency sign ₫ is not required, since prices are never shown on her page. Font licenses must allow embedding (OS/2 `fsType`).

---

## 11. Allowed HTML

**Root:** `body` (metadata attributes only); `style` elements anywhere.

**Elements (theme content):** every inert HTML element: `div section header footer main article aside nav figure figcaption address hgroup h1–h6 p span strong em b i u s sub sup mark q cite abbr dfn code pre kbd samp var small br wbr hr blockquote time data ins del bdi bdo ruby rt rp ul ol li dl dt dd table caption colgroup col thead tbody tfoot tr th td img audio` (only `data-ms-music`) and inline `svg` with: `g path circle ellipse rect line polyline polygon text tspan defs linearGradient radialGradient stop clipPath mask use` (`use` → `#local` only).

**Attributes:** `class id style title alt role aria-* lang dir width height loading decoding src` (embedded `data:`, or `https:` on `img`) `colspan rowspan scope headers span value datetime start reversed` `data-ms-*` (spec names only), and SVG presentation attributes. `srcset`/`sizes` are not allowed in themes; the engine sets them on slot images.

**Rejected:** everything else, including `doctype html head title meta script noscript link base`, a `style` with attributes other than `type`, `iframe frame object embed form input button select textarea a details dialog template slot portal video canvas picture source track map area math foreignObject`, every `on*` attribute, `href`/`xlink:href` other than `#local` in SVG, and `srcdoc`.

---

## 12. Lifecycle

### 12.1 Upload and validation

The upload goes through the processing sandbox, then real end-to-end tests:

1. Check the file is a single `<body>` element → parse its content as an HTML fragment in body context (spec-compliant parser, with limits) → hard rules (§2) → metadata (§4)
2. Structure & slots (§6) → CSS (§7) → HTML allowlist (§11)
3. Extract and process embedded assets (§10) → token contrast (§5) → glyph coverage
4. Build sample pages with test data → **E2E tests** in a sandbox (the platform validation pipeline)
5. Store as immutable `themeHash` (sha256 of the normalized, processed theme)

Errors are returned as `{ line, column, code, message }`, e.g. `{ "line": 48, "code": "struct.gift_name_missing", "message": "The gift template needs exactly one data-ms-slot=\"gift-name\"" }`. Full code list in Appendix B.

### 12.2 Versioning

- Each upload is a new **immutable** version: (`owner`, `data-ms-id`, `data-ms-version`) → `themeHash`.
- A published page **pins** its `themeHash`. Updating a theme never changes live pages; the giver is asked "Apply to this page?" and can republish.

### 12.3 In-app "Customize"

"Customize" on a built-in creates the giver's own copy of that HTML file. The in-app editor changes only tokens, effects and option defaults; the result is saved as a new version and validated like any upload.

### 12.4 Visibility

Custom themes are private to their owner in v1. Deleting one keeps any version still pinned by a live page until that page is unpublished.

---

## 13. Serving summary

- Receiver pages: static, `myspecial.com/{user}/{slug}/`, no auth cookies valid there.
- The backend builds the whole document around the theme (§3): doctype, `<head>`, engine screens, footer and the engine runtime (our only script). The theme contributes only its processed CSS and its filled body content. Assets load from the user-content domain. Strict CSP: the platform security spec §A6.4.
- The engine owns every interaction, request and link.

---

## 14. Built-in themes (v1)

| id | Display font | Ground / accent | Effects |
|---|---|---|---|
| `rice-paper` | Newsreader italic | `#EFE6D6` / `#B3392F`, `--ms-ground: wrap` | (none) — the default for new pages |
| `blush` | Playfair Display italic | `#FFF1F4` / `#C2255C` | intro `unwrap`, pick `confetti` |
| `midnight` | Bricolage Grotesque | `#15112A` / `#F4B6CF` | ambient `stars`, pick `glow` |
| `garden` | Lora 600 | `#EEF3EA` / `#2F6B45` | ambient `petals` |
| `letter` | Dancing Script 600 | `#FBF3E6` / `#A3412A` | intro `envelope` |

Each lives in the public templates repo at `official/<id>/theme.html` with its fonts embedded (all SIL OFL; licenses in `official/<id>/licenses/`). Each must pass the full pipeline in CI. Community themes follow the same layout under `community/<github-user>/<id>/` (the README).

---

## 15. Open questions

1. Sharing / marketplace for themes?
2. ~~Dev kit~~ — **Decided:** the open-source `myspecial-theme` CLI (`validate`, `preview`), shipped as one file in the templates repo.
3. Are custom uploads free or premium?

---

## Appendix A — minimal valid theme

```html
<body data-ms-spec="1.0" data-ms-id="ocean-date" data-ms-name="Ocean Date" data-ms-version="1.0.0"
      data-ms-effects="ambient=sparkle:low">
  <style>
    @font-face { font-family: "Lora"; font-weight: 600; src: url(data:font/woff2;base64,…) format("woff2"); }
    body {
      --ms-color-bg: #EAF4F7; --ms-color-surface: #FFFFFF; --ms-color-ink: #0E2A33;
      --ms-color-muted: #3E5C66; --ms-color-line: #CFE3EA; --ms-color-soft: #C9E3EC;
      --ms-color-accent: #0F6E8C; --ms-color-on-accent: #FFFFFF;
      --ms-font-display: "Lora", serif;
      margin: 0; background: var(--ms-color-bg); color: var(--ms-color-ink);
    }
    .page { max-width: 1040px; margin: 0 auto; padding: 32px 20px; }
    h1 { font-family: var(--ms-font-display); font-size: clamp(32px, 7vw, 48px); }
    .gifts { list-style: none; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(156px, 1fr)); gap: 12px; }
    .gift { background: var(--ms-color-surface); border: 2px solid var(--ms-color-line); border-radius: var(--ms-radius-card); overflow: hidden; }
    .gift[aria-checked="true"] { border-color: var(--ms-color-accent); }
    .gift img { width: 100%; aspect-ratio: 1; object-fit: cover; display: block; }
    .gift h3, .gift p { margin: 8px 12px; }
  </style>

  <div class="page">
    <p data-ms-slot="dedication">For Linh, from Vu</p>
    <h1 data-ms-slot="title">Happy anniversary, my love</h1>
    <div data-ms-slot="message"><p>Pick the one that makes you smile.</p></div>
    <h2 data-ms-text="pick-heading">Choose the one you want most</h2>
    <ul class="gifts" data-ms-gift-list>
      <li class="gift" data-ms-gift>
        <img data-ms-slot="gift-image" alt="" src="data:image/webp;base64,…">
        <h3 data-ms-slot="gift-name">Pottery class for two</h3>
        <p data-ms-slot="gift-note" data-ms-if="gift-note">You keep sending me those videos.</p>
      </li>
    </ul>
  </div>
</body>
```

## Appendix B — validation error codes (structure)

| Code | Meaning |
|---|---|
| `file.too_large` / `file.not_utf8` / `file.not_single_body` (doctype, `<html>`, `<head>` or content outside `<body>`) | §2.1 |
| `js.script_element` / `js.event_attribute` / `js.javascript_url` | §2.2 |
| `ref.external` / `ref.insecure` (an `http:` image) / `ref.import` | §2.3 |
| `font.no_fallback` (warning) | §2.3, §7 |
| `html.element_not_allowed` / `html.attribute_not_allowed` | §11 |
| `meta.missing` / `meta.unknown` / `meta.invalid` / `meta.version_not_increased` | §4 (`<body>` attributes) |
| `struct.body_attribute` / `struct.style_attributes` | R1 |
| `struct.required_slot_missing` (`title`) | R2 |
| `struct.gift_list_count` | R3 |
| `struct.no_gift_template` | R4 |
| `struct.gift_outside_list` / `struct.gift_nested` | R5 |
| `struct.gift_name_missing` / `struct.gift_image_missing` / `struct.gift_slot_duplicate` | R6 |
| `struct.slot_duplicate` / `struct.slot_wrong_scope` | R7 |
| `struct.unknown_slot` / `struct.unknown_data_attr` | R8 |
| `struct.slot_wrong_element` | R9 (an image slot not on `img`; a slot, gift or gift list on an element that cannot hold content) |
| `struct.required_slot_missing` | §6.2 (`title`, `dedication`) |
| `css.*` | §7 (`css.reserved_name`: an `ms-` class, id or `@keyframes` name) |
| `html.reserved_name` | §7, §11 (an `ms-` class or id in the markup) |
| `css.keyframes_name` | §7 (an escaped or quoted `@keyframes` name) |
| `internal.unexpected` | The file could not be checked (never a crash: the upload is rejected and can be tried again) |
| `asset.*` (type, size, dimensions, magic mismatch, glyph coverage, license) | §10 |
| `token.contrast` (warning) | §5 |
| `text.untranslated` (warning) | §6.5 |
