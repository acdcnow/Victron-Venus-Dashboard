# 🗲 Victron Venus Dashboard for Home Assistant 🗲

A custom [Home Assistant](https://www.home-assistant.io/) card that reproduces the
Victron Venus GUI v2 overview: one box per device, connected by lines whose flow
follows your power values.

**Current pre-release: `2.0.0-beta.4`** — a rework for Home Assistant 2026.9 with
decimal places per entity, a controllable flow direction and fully customizable
backgrounds and colours, with a graphical colour picker. Every option of the card
is available in the visual editor, so no YAML is needed for any feature.

---

## Versions and compatibility

| Version | Home Assistant | Where to get it | Status |
| --- | --- | --- | --- |
| **2.0.0-beta.4** | Built for **2026.9** | GitHub pre-release `2.0.0-beta.4`, branch `HA2026_09_dev` | Pre-release, documented on this page |
| 2.0.0-beta.3 | Built for 2026.9 | GitHub pre-release `2.0.0-beta.3` | Superseded by `2.0.0-beta.4` |
| 2.0.0-beta.2 | Built for 2026.9 | GitHub pre-release `2.0.0-beta.2` | Superseded by `2.0.0-beta.4` |
| 2.0.0-beta.1 | Built for 2026.9 | GitHub pre-release `2.0.0-beta.1` | Superseded by `2.0.0-beta.4` |
| 1.17.0 | 2026.1 and newer | Default branch, release `1.17.0` | Stable, see the [1.17.0 README](https://github.com/acdcnow/Victron-Venus-Dashboard/blob/1.17.0/README.md) |

> **The default branch still contains the 1.17.0 code.** Everything documented
> below describes the 2.0 pre-release. To install it, add the repository in HACS
> and enable pre-release versions, then download `2.0.0-beta.4`. Stay on `1.17.0`
> if you do not want a pre-release.

The card itself renders on older Home Assistant versions as well, because every
design token has a fallback. The **visual editor** uses the current frontend
components (`ha-tab-group`, `ha-form`), so on older installations configure the
card with YAML instead.

The pre-release is verified without a Home Assistant instance: the test harness
renders the card and the editor in a real browser and covers the configuration
handling, the number formatting, the flow direction and the generated styles (see
[Testing](#testing)). Please report anything that behaves differently on your
instance.

---

## Features

* 🎛 **Full visual editor** — one tab for the card, one per column, no YAML needed.
  Every option below is reachable in the editor, including adding and removing a
  box or a connection.
* 🔢 **Decimal places per entity** — every value, including the header and footer
  sensors, has its own precision setting, and the card can follow the display
  precision of Home Assistant.
* 🔀 **Flow direction control** — per connection: automatic, forward, reverse,
  both directions or no indicator at all, plus a line shape per connection.
* 🎨 **Background presets** — theme, transparent, solid colour, gradient, image or
  custom CSS, with light and dark variants and a colour picker for every colour.
* 🌈 **Customizable colours** — Home Assistant theme, the classic Victron palette
  or your own colours for eleven colour slots, each with a picker and a free text
  field for CSS values.
* 🛠 **Everything else** — fonts, spacing, line width, indicator size, opacity,
  gauge, sparkline window, and raw CSS as the last resort.
* 🚀 **Zero dependencies** — no additional cards or libraries, no build step.
* 🌓 **Theme support** — follows your Home Assistant theme automatically.
* 🌎 **Multi-language editor** — English, German, Spanish, French and Italian.
* ♿ **Accessible** — keyboard reachable boxes, visible focus, reduced-motion aware
  animations, `unavailable` states shown as such.

---

## Installation

### HACS (recommended)

1. Open HACS in Home Assistant.
2. Go to **Frontend**.
3. Click the three dots in the top right corner and select **Custom repositories**.
4. Add `https://github.com/acdcnow/Victron-Venus-Dashboard` and select **Lovelace**.
5. Search for "Victron Venus Dashboard" and click **Download**.
   * For the 2.0 pre-release, first enable beta versions for this repository, then
     pick `2.0.0-beta.4`.
6. Reload your browser.

HACS downloads the whole `dist` folder, so updating through HACS is always
preferred over copying single files.

### Manual

1. Download all files of the `dist` folder of this repository (the card is a set
   of ES modules).
2. Place them in `config/www/venus-os-dashboard/`.
3. Add the resource in **Settings → Dashboards → three dots → Resources**:
   `/local/venus-os-dashboard/Victron-Venus-Dashboard.js` as **JavaScript module**.
4. Reload your browser.

---

## Usage

Add the card and open the visual editor. The editor has one tab for the card
itself and one tab per column.

### Card tab

| Section | What it configures |
| --- | --- |
| Layout | Theme, preview mode, number of devices per column, card height, corner radius, spacing |
| Background | Preset, the four background colours with pickers, gradient, image, opacity, whether it covers the whole card and custom CSS |
| Colors | Home Assistant theme, the classic Victron palette or your own colours for eleven slots, each with a picker |
| Number formatting | Decimal places, Home Assistant display precision, trailing zeros, number only filter and the text for missing entities |
| Connection lines | Flow direction, line shape, animation, speed, width, indicator size and opacity |
| Fonts | Font sizes and weights per zone, font family, unit size |
| History graphs | History window, refresh interval and graph detail |
| Custom CSS | Raw CSS for the card element |

### Column tabs

Each box has its own panels for the header (icon and name), the main sensors, the
header and footer sensors, the anchors and the connections.

The tabs offer one entry per box of the current column layout, also for boxes that
have no settings yet: fill in a field and the box appears on the card. Clear every
field and the box is removed again. The same applies to a connection. Nothing of
that needs YAML.

---

## Decimal places

The value of every entity is formatted with the first setting that applies:

1. the setting of that entity slot (`devices.<box>.decimals_*`),
2. the device setting (`devices.<box>.decimals`, which is the main value),
3. the card setting (`numbers.decimals` or `numbers.auto`).

| Value | Meaning |
| --- | --- |
| not set | The value is shown exactly as Home Assistant reports it |
| `auto` | Uses the display precision of that entity in Home Assistant |
| `0` … `6` | Fixed number of decimal places |

`numbers.main_only: true` is the filter for the secondary values: the card wide
setting then only reformats the main value of each device, and the header, footer
and second values stay untouched until they get their own setting.

States that are not numbers (`on`, `off`, `unknown`, `unavailable`, …) are never
reformatted, so binary sensors and text sensors keep working.

```yaml
type: custom:venus-os-dashboard
numbers:
  decimals: 1          # all main values
  main_only: true      # leave the secondary values alone
  trim: true           # 12.50 becomes 12.5
devices:
  "1-2":
    name: Battery
    entity: sensor.battery_soc
    entity2: sensor.battery_current
    decimals_entity2: 2
    headerEntity: sensor.temperature
    decimals_header: auto
```

---

## Connection lines

Every connection is a line between one anchor of a box and an anchor of another
box. The visible dots travel along that line.

```yaml
devices:
  "1-1":
    name: Grid
    anchors: "R-1"
    link:
      1:
        start: R-1
        end: 2-1_L-1
        entity: sensor.grid_power
        direction: auto
        curve: auto
```

| `direction` | Behaviour |
| --- | --- |
| `auto` | Follows the sign of `entity`: positive flows from `start` to `end`, negative the other way around, zero stands still |
| `forward` | Always from `start` to `end` |
| `reverse` | Always from `end` to `start` |
| `both` | Two dots, one in each direction |
| `off` | No dot, only the line |

`links.direction` sets the default for every connection. The version 1 key
`inv: true` still means `reverse`. The editor shows the direction (and the line
shape) inside the panel of every single connection.

Anchor names are `<column>-<box>_<side>-<index>`, with `L`, `R`, `T` and `B` for
left, right, top and bottom. `anchors: "L-1, B-2"` creates one anchor on the left
and two at the bottom of that box.

Further options: `links.curve` (`auto` or `straight`), `links.animate`,
`links.speed` (higher is slower), `links.width`, `links.ball_size` and
`links.opacity`. A connection can override the line shape of the card with its own
`curve` (`auto` routes around the boxes, `straight` draws a direct line, leaving
it out uses `links.curve`). When your system asks for reduced motion, the dots are
placed at the start of the line instead of animating.

---

## Background and colours

```yaml
type: custom:venus-os-dashboard
background:
  preset: gradient        # theme | none | solid | gradient | image | custom
  from: "#0b1e33"
  to: "#000000"
  angle: 160
  opacity: 90
  card: true              # apply it to the whole card
colors:
  mode: theme             # theme | venus | custom
  box: "#1f2a3c"          # only the slots you fill in differ
  line: var(--accent-color)
```

* `theme` follows the Home Assistant theme variables, so the card looks native in
  every theme.
* `venus` uses the classic dark navy palette of the original card.
* `custom` starts from the theme and applies your own colours.
* Every colour accepts `#rrggbb`, `rgb()`, `hsl()`, a colour name or a CSS
  variable such as `var(--accent-color)`.

In the editor every colour option has a picker: the swatch opens the picker of your
browser and stores a plain `#rrggbb` value, while the text field next to it keeps
accepting any CSS colour. That way a colour can be picked by eye and a theme
variable can still be typed. A value the picker cannot display (a variable, for
example) is marked with a dashed border instead of being replaced, and the button
to the right of the text field clears the option so the theme value applies again.

The card also exposes its own custom properties, so a theme or another card can
restyle it without touching the configuration:
`--vv-dashboard-bg`, `--vv-box-bg`, `--vv-boxBorder`, `--vv-shadow`,
`--vv-anchor`, `--vv-line`, `--vv-ball`, `--vv-graph`, `--vv-text`,
`--vv-unit`, `--vv-gauge`, `--vv-font-header`, `--vv-font-sensor`,
`--vv-font-sensor2`, `--vv-font-footer`, `--vv-line-width`, `--vv-line-opacity`.

---

## Full reference

```yaml
type: custom:venus-os-dashboard
theme: auto                 # auto | light | dark
demo: false                 # render an empty card, useful while designing

layout:
  columns: [2, 1, 2]        # boxes per column (max 4 / 2 / 4)
  aspect: 60                # height as percentage of the width
  radius: 10
  gap: 8                    # space between the columns, in percent
  padding: 25px 20px 15px 20px
  max_box_height: 45

background:                 # see above
  preset: theme
colors:                     # see above
  mode: theme
numbers:
  decimals: 1               # card default, omitted means "as reported"
  auto: false               # use the Home Assistant display precision
  main_only: false          # only reformat the main values
  trim: false               # drop trailing zeros
  missing: "N/C"            # text for missing entities
links:
  direction: auto
  curve: auto               # auto | straight
  animate: true
  speed: 10
  width: 2
  ball_size: 4
  opacity: 1
typography:
  header: auto              # auto or a CSS length such as 14px
  sensor: auto
  sensor2: auto
  footer: auto
  family: ""                # empty keeps the theme font
  header_weight: 400
  sensor_weight: 400
  unit_scale: 1
graphs:
  hours: 24                 # history window
  refresh: 15               # minutes between refreshes
  segments: 6               # min/max segments kept when reducing the history
custom_css: ""              # raw CSS for the card element

devices:
  "1-1":
    icon: mdi:transmission-tower
    name: Grid
    entity: sensor.grid_power
    decimals: 0
    entity2: sensor.grid_frequency
    decimals_entity2: 2
    headerEntity: sensor.grid_voltage
    decimals_header: auto
    footerEntity1: sensor.grid_current
    decimals_footer1: 1
    footerEntity2: ""
    decimals_footer2: ""
    footerEntity3: ""
    decimals_footer3: ""
    gauge: false            # show a 0-100 gauge for percentage entities
    graph: true             # show the history sparkline
    anchors: "R-1, B-2"
    link:
      1:
        start: R-1
        end: 2-1_L-1
        entity: sensor.grid_power
        direction: auto          # auto | forward | reverse | both | off
        curve: auto              # auto | straight, or omitted for links.curve
```

---

## Migrating from 1.x

Nothing has to be done: the card still reads `param.boxCol1..3`, `styles.header`,
`styles.sensor`, `devices.<box>.decimals` and `link.<n>.inv`. As soon as you edit
a value in the visual editor the modern key is written and the old one is removed
for that option.

The default look did change: the card now follows your Home Assistant theme and
uses the card background instead of the hardcoded near-black colour. Set
`colors.mode: venus` and `background.preset: solid` with `#111111` to get the old
appearance back.

See [CHANGELOG.md](https://github.com/acdcnow/Victron-Venus-Dashboard/blob/HA2026_09_dev/CHANGELOG.md)
for the complete list of additions, fixes and upgrade notes.

---

## Testing

The 2.0 branch ships with two test layers in its `tests` folder, both runnable
without a Home Assistant instance:

```bash
python tests/static-check.py    # translations, imports, deprecations, HACS layout
python -m http.server 8765      # then open /tests/harness.html
```

The browser harness stubs the Home Assistant frontend components, renders the card
and the editor in a real browser and checks the configuration migration, the decimal
handling, the flow direction, the line shapes, the colour pickers, the generated
style variables, the editor round trip and that every option of the card is
reachable in the editor (219 checks).

---

## Troubleshooting

### `libVenus.renderDashboard is not a function`

The card is a set of ES modules and a browser caches every file under its own URL.
HACS only adds its cache busting parameter to the file Home Assistant loads, so
after an update the browser could serve a new card file next to a cached old
`lib-venus.js`. That message means exactly that: the card files are mixed.

Since `2.0.0-beta.4` every internal import carries the version, so an update always
loads a matching set of files and the problem cannot come back. If you see it on an
older version:

1. Reload the page with a cleared cache (`Ctrl+Shift+R`, on Safari `Cmd+Shift+R`).
2. If it stays, download the card again in HACS (or copy the whole `dist` folder
   again) and reload.
3. Make sure the card is installed only once. A manual copy in
   `config/www/venus-os-dashboard/` next to a HACS installation means two copies of
   the same modules, and only one of them gets updated.

From `2.0.0-beta.4` on a stale module shows a message telling you to clear the cache
instead of the bare JavaScript error.

### `the name "venus-os-editor" has already been used with this registry`

Two copies of a module were evaluated, normally because the card is installed twice
(see above). The custom elements are registered only when they are still unknown
now, so the message does not appear any more and the card keeps working.

---

## Credits

Based on [skydarc/Venus-OS-Dashboard](https://github.com/skydarc/Venus-OS-Dashboard).

## License

MIT
