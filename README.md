# 🗲 Victron Venus Dashboard for Home Assistant 🗲

A custom [Home Assistant](https://www.home-assistant.io/) card that reproduces the
Victron Venus GUI v2 overview: one box per device, connected by lines whose flow
follows your power values.

Current version: **2.0.0-beta.1**

---

## What changed in 2.0

* **Home Assistant 2026.9 ready.** The card no longer uses the removed Shoelace
  components, renders inside a shadow root instead of leaking a stylesheet into
  every other card, and uses the current Home Assistant design tokens and theme
  variables.
* **Decimal places per entity.** Every entity slot (main, second, header and the
  three footer values) has its own decimal setting, and the card can follow the
  display precision you configured in Home Assistant.
* **Flow direction control.** Each connection can flow forwards, backwards, in
  both directions at once or stay still, and the default follows the sign of the
  linked entity.
* **Background presets.** Choose theme, transparent, a solid colour, a gradient,
  an image or custom CSS, per light and dark mode.
* **Everything is customizable.** Colours, fonts, spacing, line width, indicator
  size, graph window and the option to add your own CSS.

Existing 1.x configurations keep working: the old keys (`param`, `styles`,
`devices.<box>.decimals`, `link.<n>.inv`) are still read.

---

## Installation

### HACS (recommended)

1. Open HACS in Home Assistant.
2. Go to **Frontend**.
3. Click the three dots in the top right corner and select **Custom repositories**.
4. Add `https://github.com/acdcnow/Victron-Venus-Dashboard` and select **Lovelace**.
5. Search for "Victron Venus Dashboard" and click **Download**.
6. Reload your browser.

### Manual

1. Download `dist/Victron-Venus-Dashboard.js` **and the other files of the `dist`
   folder** of this repository.
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
| Layout | Theme, number of devices per column, card height, corner radius, spacing |
| Background | Preset, colours, gradient, image, opacity and custom CSS |
| Colors | Either the Home Assistant theme, the classic Victron palette or your own colours |
| Number formatting | Decimal places, Home Assistant display precision, trailing zeros |
| Connection lines | Flow direction, line shape, animation, speed, width, indicator size |
| Fonts | Font sizes and weights per zone, font family, unit size |
| History graphs | History window and refresh interval |
| Custom CSS | Raw CSS for the card element |

### Column tabs

Each box has its own panels for the header (icon and name), the main sensors, the
header and footer sensors, the anchors and the connections.

---

## Decimal places

The value of every entity is formatted with the first setting that applies:

1. the setting of that entity slot (`devices.<box>.decimals_*`),
2. the device setting (`devices.<box>.decimals`, which is the main value),
3. the card setting (`numbers.decimals` or `numbers.auto`).

Values:

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

Every connection is a line between one anchor of the box and an anchor of another
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
```

| `direction` | Behaviour |
| --- | --- |
| `auto` | Follows the sign of `entity`: positive flows from `start` to `end`, negative the other way around, zero stands still |
| `forward` | Always from `start` to `end` |
| `reverse` | Always from `end` to `start` |
| `both` | Two dots, one in each direction |
| `off` | No dot, only the line |

`links.direction` sets the default for every connection, and the version 1 key
`inv: true` still means `reverse`.

Anchor names are `<column>-<box>_<side>-<index>`, with `L`, `R`, `T` and `B` for
left, right, top and bottom. `anchors: "L-1, B-2"` creates one anchor on the left
and two at the bottom of that box.

Further options: `links.curve` (`auto` or `straight`), `links.animate`,
`links.speed` (higher is slower), `links.width`, `links.ball_size` and
`links.opacity`. When your system asks for reduced motion, the dots are placed at
the start of the line instead of animating.

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

Additionally the card exposes its own custom properties, so a theme or another
card can restyle it without touching the configuration:
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
        direction: auto
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

---

## Testing

The card ships with two test layers, both runnable without a Home Assistant
instance:

```bash
python tests/static-check.py                  # translations, imports, deprecations
python -m http.server 8765                    # then open /tests/harness.html
```

The browser harness stubs the Home Assistant frontend components, renders the card
and the editor in a real browser and checks the configuration migration, the
decimal handling, the flow direction, the generated style variables and the editor
round trip.

---

## Credits

Based on [skydarc/Venus-OS-Dashboard](https://github.com/skydarc/Venus-OS-Dashboard).

## License

MIT
