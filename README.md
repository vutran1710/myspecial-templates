# MySpecial templates

Themes for [MySpecial](https://myspecial.com) gift pages. A giver picks a few gifts and sends one link; she opens a page in one of these themes and picks the one she wants.

```
official/<id>/                 themes made by MySpecial (the built-in themes)
community/<github-user>/<id>/  themes made by the community, added by pull request
SPEC.md                        the theme format
CONTRIBUTING.md                how to make and submit a theme
tools/                         build + checks (no dependencies)
```

Each theme is **one HTML file containing only `<body>`**: no JavaScript, nothing loaded from outside, fonts and images embedded. It marks **slots** where MySpecial puts the real gifts, names and message. Open any `theme.html` in a browser to see it with sample content.

## How themes get to MySpecial

1. A pull request adds or changes a theme. CI checks the build and the repo rules (and, soon, runs the full validator + end-to-end tests).
2. A maintainer reviews it.
3. On merge, MySpecial pulls the changed `theme.html` files through **the same validation pipeline as any upload**. Only themes that pass appear in the app: official ones as built-in themes, community ones under "Community".

## Licenses

Code and themes: [MIT](LICENSE). Embedded fonts keep their own licenses (in each theme's `licenses/` folder). Images must be your own work or CC0.
