# MySpecial templates

Themes for [MySpecial](https://myspecial.com) gift pages. A giver picks a few gifts and sends one link; she opens a page in one of these themes and picks the one she wants.

```
official/<id>/                 themes made by MySpecial (the built-in themes)
community/<github-user>/<id>/  themes made by the community, added by pull request
SPEC.md                        the theme format
CONTRIBUTING.md                how to make and submit a theme
tools/                         build, checks and the myspecial-theme CLI (no dependencies)
```

Each theme is **one HTML file containing only `<body>`**: no JavaScript, nothing loaded from outside, fonts and images embedded. It marks **slots** where MySpecial puts the real gifts, names and message. Open any `theme.html` in a browser to see it with sample content.

## How themes get to MySpecial

1. A pull request adds or changes a theme. CI checks the build, the repo rules, and runs the **same validator** MySpecial uses (`tools/myspecial-theme.mjs`).
2. A maintainer reviews it.
3. On merge, MySpecial pulls the changed `theme.html` files through **the same validation pipeline as any upload**. Only themes that pass appear in the app: official ones as built-in themes, community ones under "Community".

## Check a theme yourself

Needs Node 20+. No install.

```bash
node tools/myspecial-theme.mjs validate official/blush/theme.html
node tools/myspecial-theme.mjs preview  official/blush/theme.html --locale vi   # opens a sample gift page on http://localhost:4173
```

`tools/myspecial-theme.mjs` is one readable file built from MySpecial's validator and page engine (MIT). Don't edit it by hand; it's updated from the main project.

## Licenses

Code and themes: [MIT](LICENSE). Embedded fonts keep their own licenses (in each theme's `licenses/` folder). Images must be your own work or CC0.
