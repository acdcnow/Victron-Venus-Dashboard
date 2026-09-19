# Changelog

All notable changes to this project are documented in this file.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the
project uses [semantic versioning](https://semver.org/).

## [2.0.0-beta.4] - 2026-09-19

Updated modules can no longer be mixed with cached ones, and a duplicate copy of a
module no longer breaks the card.

> This is a pre-release and is not merged into `main` yet. Enable beta versions for
> this repository in HACS to install it.

### Fixed

* **`libVenus.renderDashboard is not a function` after an update.** The card is a
  set of ES modules and a browser caches every file under its own URL. HACS only
  adds its cache busting parameter to the file Home Assistant loads, so the browser
  kept serving the previous `lib-venus.js` next to the new card. Every internal
  import now carries the version (`./lib-venus.js?v=2.0.0-beta.4`), so an update
  loads a complete set of matching files. The static checks fail when an import is
  added without the version, so this cannot come back unnoticed.
* **`the name "venus-os-editor" has already been used with this registry`.**
  Registering a custom element twice throws and took the card with it when the
  browser evaluated a second copy of a module (a manual installation next to the
  HACS one, for example). Both elements are registered only when they are still
  unknown, and the card is offered once in the card picker.

### Changed

* A stale module now shows what to do ("the card files are out of date, reload with
  a cleared cache or download the card again") instead of a bare
  `is not a function` error.
* The test harness loads its modules through the same versioned URLs the card uses,
  and checks that a second copy of a module neither throws nor replaces the already
  registered elements.

## [2.0.0-beta.3] - 2026-09-19

A graphical colour picker for every colour option, plus a bug that silently
dropped settings when two panels were edited one after the other.

> This is a pre-release and is not merged into `main` yet. Enable beta versions for
> this repository in HACS to install it.

### Added

* **Graphical colour picker.** All fifteen colour options (the four background
  colours and the eleven colour slots) now have a swatch that opens the picker and
  writes a plain `#rrggbb` value. The text field next to it still accepts any CSS
  colour, so `var(--accent-color)` and friends keep working. A value the picker
  cannot display is marked with a dashed border instead of being overwritten, and
  the clear button next to it empties the option, which falls back to the theme.

### Fixed

* **Editing one panel discarded the changes of another one.** Every form wrote into
  the configuration it had been built with instead of the current one, so setting a
  colour and afterwards changing, say, the card height could silently drop the
  colour again. All fields write into the live configuration now.

### Changed

* The test harness grew from 186 to 219 checks: the picker, the CSS value path, the
  picker fallback for values it cannot display, the clear button and the cross panel
  behaviour are covered, plus the new labels in all five languages.

## [2.0.0-beta.2] - 2026-09-19

The visual editor now reaches every option of the card, so no feature needs YAML
anymore, plus the bugs that the audit of the editor uncovered.

> This is a pre-release and is not merged into `main` yet. Enable beta versions for
> this repository in HACS to install it.

### Added

* **Line shape per connection.** A connection can override `links.curve` with its
  own `curve`: `auto` routes around the boxes, `straight` draws a direct line.
  Leaving it out keeps using the card setting. The editor shows the field in the
  panel of every connection. Before, the option had no effect at all, because the
  normalized configuration dropped the key.
* **Preview mode** (`demo`) is editable: the card keeps the boxes and their titles
  but leaves every value empty, which is useful while designing a layout.
* **Graph detail** (`graphs.segments`) is editable: it decides how many min/max
  segments survive when the history is reduced for the sparkline.
* **Boxes and connections can be added and removed in the editor.** Every box of
  the column layout has its own tab, also when it has no settings yet: fill in a
  field and the box appears on the card. Clear every field again and the entry is
  removed from the configuration, so the YAML stays clean. Previously such a box
  could only be reached by editing YAML, and there was no way to delete one.

### Fixed

* `background.card` could not be switched off in the editor. A missing key means
  "on", so the off state is stored explicitly now.
* Two editor labels were never translated and silently showed the internal schema
  name: the number only filter (`numbers_main_only`) and the line shape of a
  connection (`link_curve`). Both are now part of all five languages.
* A missing translation is shown as a visible marker instead of falling back to
  the schema name, which is what hid the two labels above.

### Changed

* The test harness grew from 152 to 186 checks. It now verifies that every
  documented option is writable from the editor (and that the editor writes no
  undocumented option), that a fully configured card can be rebuilt from the editor
  data, and that every label resolves in all five bundled languages.

## [2.0.0-beta.1] - 2026-09-19

Modernisation for Home Assistant 2026.9 with three new ways to shape the card:
decimal places per entity, controllable flow direction and configurable
backgrounds.

> This is a pre-release and is not merged into `main` yet. Enable beta versions for
> this repository in HACS to install it.

### Added

* **Decimal places per entity.** Every entity slot (main value, second value,
  header value and the three footer values) has its own `decimals_*` setting. The
  card also reads the display precision you configured for the entity in Home
  Assistant (`decimals: auto`) and the placeholder text for missing entities.
* **Decimal filter.** `numbers.main_only` keeps the card wide decimal setting for
  the main value only, so the secondary values are shown exactly as Home Assistant
  reports them until they get their own setting.
* **Flow direction control.** `links.direction` sets the default and every
  connection can override it with `auto`, `forward`, `reverse`, `both` or `off`.
  `auto` still follows the sign of the linked entity, `both` sends two dots along
  the line at the same time and `off` hides the dot but keeps the line.
* **Background presets.** `background.preset` offers `theme`, `none`, `solid`,
  `gradient`, `image` and `custom`, with separate light and dark colours, an angle,
  opacity, a blend mode, an optional image and `background.card` to decide whether
  the background covers the whole card.
* **Colour source.** `colors.mode` switches between the Home Assistant theme, the
  classic Victron palette and your own colours, with an override for each of the
  eleven colour slots. Every colour accepts `#rrggbb`, `rgb()`, `hsl()`, a name or
  a CSS variable.
* Full colour, font, spacing and line customisation, capped by `custom_css` and
  `background.css` for anything the options do not cover.
* Configurable history window (`graphs.hours`) and refresh interval
  (`graphs.refresh`) for the sparklines.
* The editor is now schema driven and renders with `ha-form`, grouped into
  collapsible panels, with translated labels and helper texts in English, German,
  Spanish, French and Italian.
* The card exposes `--vv-*` custom properties for theming and implements
  `getGridOptions()` so it behaves in the new sections layout.

### Fixed

* The card no longer injects its stylesheet into the whole dashboard. It renders
  inside a shadow root, so its styles cannot leak into other cards any more.
* Two connections that start at the same anchor no longer share a single animation
  state; previously the second one silently overwrote the first.
* Animation frames are now tracked and cancelled. Before, every redraw left an
  endless `requestAnimationFrame` loop behind.
* The unit of a value is no longer swallowed when the value is updated: setting the
  number erased the element that holds the unit.
* Anchors are distributed correctly again (`L-1` sits in the middle of the box, not
  at the bottom edge).
* The dashboard keeps its aspect ratio container, so a card without an explicit
  height still lays out and draws its connection lines.
* `hass-more-info` is dispatched as a `CustomEvent` that escapes the shadow root,
  so clicking a box opens the more info dialog again.
* The card reports a helpful message instead of throwing when the configuration is
  invalid, and shows `unavailable` values in a muted style.
* `hacs.json` names the plugin file explicitly, so HACS does not have to guess
  between the JavaScript files in the `dist` folder.

### Changed

* **Redesigned for Home Assistant 2026.9.** The editor uses `ha-tab-group` and
  `ha-form`; the removed Shoelace `sl-tab-*` components are gone.
* **The card follows your theme by default.** Colours come from Home Assistant
  theme variables and design tokens (`--ha-space-*`, `--ha-animation-duration-*`)
  instead of hardcoded hex values. `colors.mode: venus` brings the classic dark
  palette back.
* The card reacts to resizes through a `ResizeObserver` instead of reaching into
  the private DOM of `home-assistant-main`.
* Box contents are built once per configuration and only their values are updated
  afterwards, instead of rebuilding the markup on every state change.
* The dots respect `prefers-reduced-motion` and stand still at the start of the
  line when reduced motion is requested.

### Upgrade notes

* Nothing has to be reconfigured. The version 1 keys (`param`, `styles`,
  `devices.<box>.decimals`, `link.<n>.inv`) are still read, and the editor replaces
  them with the modern keys as soon as you change a value.
* HACS downloads the whole `dist` folder, so update the card through HACS instead
  of copying a single file by hand.
* The default appearance changed from the hardcoded dark look to the Home
  Assistant theme. Use `colors.mode: venus` and `background.preset: solid` with
  `#111111` for the previous look.
* `state_class`-like automatic formatting is not attempted: if you want rounded
  values, set `numbers.decimals` or `numbers.auto`.
* The card is rendered in a shadow root from now on. Custom styles that targeted
  the card from the outside need to use the `--vv-*` custom properties or the
  `custom_css` option.

## [1.17.0] - 2026-01-08

Visual editor improvements: horizontal tabs, a reworked header and footer sensor
section, correct active state for the sub tabs and more stable column rendering.

[2.0.0-beta.1]: https://github.com/acdcnow/Victron-Venus-Dashboard/compare/1.17.0...2.0.0-beta.1
[1.17.0]: https://github.com/acdcnow/Victron-Venus-Dashboard/releases/tag/1.17.0
