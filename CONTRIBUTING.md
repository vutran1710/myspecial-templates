# Make a theme

A theme is the design of the **gift-picking page**. MySpecial adds everything else (the opening screen, the pick bar, the confirm step, the "picked" screen), drawn in your theme's colors and fonts.

## 1. Start from Blush

```bash
mkdir -p community/<your-github-login>
cp -r official/blush community/<your-github-login>/<theme-id>
```

`<theme-id>`: 3–40 characters, `a–z 0–9 -`. Then edit `src/body.html` and the images/fonts in `src/`.

## 2. The rules (full details in [SPEC.md](SPEC.md))

- **Only `<body>`.** No doctype, `<html>` or `<head>`. Metadata goes on `<body>`: `data-ms-spec="1.0"`, `data-ms-id="<theme-id>"`, `data-ms-name`, `data-ms-version` (raise it on every change).
- **No JavaScript.** No `<script>`, no `onclick=…`, no links, buttons or forms. MySpecial adds all interaction.
- **Self-contained.** No Google Fonts, CDNs or remote images. Put files in `src/` and reference them as `{{font:file.woff2}}` / `{{img:file.svg}}`; the build embeds them.
- **One `<style>`**, as the first child of `<body>`. Write `body { … }` for the page background; declare colors as tokens (`--ms-color-bg`, `--ms-color-accent`, …) on `body`.
- **Required slots:** one `<h1 data-ms-slot="title">`, a `data-ms-slot="dedication"` line, and one gift list:
  ```html
  <ul data-ms-gift-list>
    <li data-ms-gift>                       <!-- the first gift is the template -->
      <img data-ms-slot="gift-image" alt="" src="{{img:sample.svg}}">
      <h3 data-ms-slot="gift-name">Sample gift</h3>
      <p data-ms-slot="gift-note">Sample note</p>
    </li>
  </ul>
  ```
- **Vietnamese.** Every font must include Vietnamese letters (`tools/subset-font.py` makes a small Latin + Vietnamese woff2). Use `data-ms-text="pick-heading"` for UI text so it shows in both languages.
- **Readable.** Text colors need 4.5:1 contrast with the background.
- **Style selection with CSS:** `[data-ms-gift][aria-checked="true"] { … }`.

## 3. Build and check

```bash
node tools/build.mjs            # src/body.html → theme.html
node tools/build.mjs --check    # what CI runs
open community/<you>/<theme-id>/theme.html   # preview with sample content
```

## 4. Open a pull request

Add a `README.md` (name, one line about the theme, a screenshot) and the font licenses in `licenses/`. Only change files inside `community/<your-github-login>/`. A maintainer reviews every theme. After merge, it goes through MySpecial's validator and end-to-end tests before it shows up in the app.

## What gets a theme rejected

Anything that imitates a login or payment form, tries to hide MySpecial's buttons or footer, includes tracking or outside requests, uses images you don't have the rights to, or isn't appropriate for a gift page.
