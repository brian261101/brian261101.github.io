# brian261101.github.io

Personal resume site for **Truong Thanh Gia Thinh** — Mechanical &amp; Piping Engineer,
Ho Chi Minh City. Live at <https://brian261101.github.io>.

Static, no build step, no framework. Open `index.html` and it runs.

## Layout

```
index.html              the whole page
assets/css/site.css     tokens, layout, dark + light themes
assets/js/site.js       theme toggle, EN/VI toggle, nav, scroll reveal
assets/img/             portrait
assets/cv/              CV (PDF, linked from the Download button)
```

## Editing the content

All copy lives in `index.html`. English is the text in the DOM; Vietnamese sits
right next to it in a `data-vi` (plain text) or `data-vi-html` (contains markup)
attribute on the same element, so the two can never drift into separate files:

```html
<h3 data-vi="Kỹ sư Thiết kế Đường ống">Piping Design Engineer</h3>
```

`assets/js/site.js` swaps them on the EN·VI button and remembers the choice in
`localStorage`. An element with no `data-vi` simply stays as written.

To add a job, copy an `<article class="job card rv">` block. Put `now` in the
class list for the current role — that is what turns the timeline node amber.

## Replacing the CV

Drop the new PDF into `assets/cv/` and update the two `href`s that point at it
(the hero button and the Education card chip).

## After editing CSS or JS

`index.html` links them with a `?v=N` query. Bump that number when you change
either file, otherwise returning visitors keep the browser-cached copy for a
while and will not see the change.

## Notes

- The background is a single inline SVG: a 30° isometric construction grid plus a
  tiling field of P&amp;ID symbols (gate, globe and check valves, instrument bubbles,
  reducers, flanges, a pump, a PSV, a vessel). It is defined once in `index.html`
  under `<div class="bg">` and themed through CSS variables.
- The hero drawing is a hand-built isometric pipe spool. The amber dashes are a
  `stroke-dashoffset` animation; it stops under `prefers-reduced-motion`.
- The reveal-on-scroll effect is gated behind a `.js` class set before first
  paint, so with scripting disabled the page still renders in full.
- Theme follows `prefers-color-scheme` until the visitor picks one.
