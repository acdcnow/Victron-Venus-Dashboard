# Changelog

All notable changes to this project are documented in this file.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the
project uses [semantic versioning](https://semver.org/).

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
