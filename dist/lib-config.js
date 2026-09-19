/*
 * Victron Venus Dashboard - shared configuration layer.
 *
 * Everything the card and the visual editor need to agree on lives here:
 *  - the canonical configuration schema (v2) and its migration from the v1 keys,
 *  - the presets for background, colours, number formatting and flow direction,
 *  - CSS custom properties generated from the configuration,
 *  - number formatting (per entity decimals, Home Assistant display precision).
 *
 * The card itself never touches the raw YAML: it always works on a normalized
 * configuration object created by `normalizeConfig()`.
 */

export const VERSION = "2.0.0-beta.1";

export const CARD_TYPE = "venus-os-dashboard";
export const EDITOR_TYPE = "venus-os-editor";

/* ------------------------------------------------------------------ *
 * Presets
 * ------------------------------------------------------------------ */

export const THEMES = ["auto", "light", "dark"];

export const BACKGROUND_PRESETS = [
  "theme",
  "none",
  "solid",
  "gradient",
  "image",
  "custom",
];

export const COLOR_MODES = ["theme", "venus", "custom"];

export const LINK_DIRECTIONS = ["auto", "forward", "reverse", "both", "off"];

export const LINK_CURVES = ["auto", "straight"];

export const GRID_COLUMN_LIMITS = [
  { min: 1, max: 4 },
  { min: 1, max: 2 },
  { min: 1, max: 4 },
];

/** Box background radius used by the classic Victron, um, "look". */
const VENUS_DARK = {
  dashboard: "#111111",
  box: "#1f2a3c",
  boxBorder: "transparent",
  shadow: "#38619b",
  anchor: "#38619b",
  line: "#4369a2",
  ball: "#ffffff",
  graph: "#ffffff",
  text: "#ffffff",
  unit: "#aaaaaa",
  gauge: "#38619b",
};

const VENUS_LIGHT = {
  dashboard: "#fafafa",
  box: "#ffffff",
  boxBorder: "transparent",
  shadow: "#d5d9e0",
  anchor: "#4a7cc4",
  line: "#6f93c9",
  ball: "#000000",
  graph: "#000000",
  text: "#484848",
  unit: "#7b7b7b",
  gauge: "#4a7cc4",
};

/** Colour slots, in the order the editor shows them. */
export const COLOR_SLOTS = [
  "dashboard",
  "box",
  "boxBorder",
  "shadow",
  "anchor",
  "line",
  "ball",
  "graph",
  "text",
  "unit",
  "gauge",
];

export const DEFAULT_NUMBERS = {
  /** Global fallback for every entity: null = show the state as Home Assistant reports it. */
  decimals: null,
  /** Use the display precision that Home Assistant uses for the entity. */
  auto: false,
  /**
   * Only apply the card wide setting to the main value of a device. With this
   * enabled the header, footer and second values are shown as Home Assistant
   * reports them until they get their own decimal setting.
   */
  mainOnly: false,
  /** Drop trailing zeros ("12.50" -> "12.5"). */
  trim: false,
  /** Text shown for a missing entity. */
  missing: "N/C",
};

export const DEFAULT_LINKS = {
  /** auto | forward | reverse | both | off */
  direction: "auto",
  /** auto | straight */
  curve: "auto",
  /** Pixels per second = dashboard width / speed (10 = legacy behaviour). */
  speed: 10,
  width: 2,
  ballSize: 4,
  animate: true,
  opacity: 1,
};

export const DEFAULT_LAYOUT = {
  columns: [1, 1, 1],
  /** Height of the card, as a percentage of its width. */
  aspect: 60,
  padding: "25px 20px 15px 20px",
  gap: 8,
  radius: 10,
  maxBoxHeight: 45,
};

export const DEFAULT_TYPOGRAPHY = {
  header: "auto",
  sensor: "auto",
  sensor2: "auto",
  footer: "auto",
  family: "",
  headerWeight: 400,
  sensorWeight: 400,
  unitScale: 1,
};

/* ------------------------------------------------------------------ *
 * Small helpers
 * ------------------------------------------------------------------ */

const isObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const isPlainString = (value) => typeof value === "string";

/** Returns `value` when it is a finite number, otherwise `fallback`. */
export function numberOr(value, fallback) {
  const parsed = typeof value === "number" ? value : parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/** Returns `value` when it is one of `allowed`, otherwise `fallback`. */
export function oneOf(value, allowed, fallback) {
  return allowed.includes(value) ? value : fallback;
}

/** Clamps `value` between `min` and `max`. */
export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/** `true` only for real booleans and the strings `yes`/`true`/`on`. */
export function boolOr(value, fallback) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const lowered = value.trim().toLowerCase();
    if (["true", "yes", "on", "1"].includes(lowered)) return true;
    if (["false", "no", "off", "0"].includes(lowered)) return false;
  }
  if (value === 1) return true;
  if (value === 0) return false;
  return fallback;
}


/** Sets `target[path]` (dot separated) to `value`, creating objects as needed. */
export function setPath(target, path, value) {
  const keys = path.split(".");
  let cursor = target;
  for (let i = 0; i < keys.length - 1; i += 1) {
    if (!isObject(cursor[keys[i]])) cursor[keys[i]] = {};
    cursor = cursor[keys[i]];
  }
  cursor[keys[keys.length - 1]] = value;
  return target;
}

/** Reads `source[path]` (dot separated), returning `fallback` when absent. */
export function getPath(source, path, fallback = undefined) {
  const keys = path.split(".");
  let cursor = source;
  for (const key of keys) {
    if (!isObject(cursor) || !(key in cursor)) return fallback;
    cursor = cursor[key];
  }
  return cursor === undefined ? fallback : cursor;
}

/** Deletes `source[path]` (dot separated) and prunes empty parents. */
export function deletePath(source, path) {
  const keys = path.split(".");
  const stack = [];
  let cursor = source;
  for (let i = 0; i < keys.length - 1; i += 1) {
    if (!isObject(cursor[keys[i]])) return source;
    stack.push([cursor, keys[i]]);
    cursor = cursor[keys[i]];
  }
  delete cursor[keys[keys.length - 1]];
  for (let i = stack.length - 1; i >= 0; i -= 1) {
    const [parent, key] = stack[i];
    if (isObject(parent[key]) && Object.keys(parent[key]).length === 0) {
      delete parent[key];
    }
  }
  return source;
}

/* ------------------------------------------------------------------ *
 * Colours
 * ------------------------------------------------------------------ */

/** Any CSS colour (variable, rgb(), name, ...) is a valid configuration value. */
export function isCssColor(value) {
  if (!isPlainString(value)) return false;
  const trimmed = value.trim();
  if (trimmed === "") return false;
  return (
    trimmed.startsWith("#") ||
    trimmed.startsWith("var(") ||
    trimmed.startsWith("rgb") ||
    trimmed.startsWith("hsl") ||
    trimmed === "transparent" ||
    trimmed === "currentColor" ||
    /^[a-z]+$/i.test(trimmed)
  );
}

/**
 * Resolves the colour slot values for the requested theme.
 *
 * `mode: "theme"` delegates to the Home Assistant theme, `"venus"` keeps the
 * classic Victron palette and `"custom"` starts from the theme values so that
 * only the slots the user filled in differ.
 */
export function resolveColors(config, isDark) {
  const mode = config.colors.mode;
  const preset = isDark ? VENUS_DARK : VENUS_LIGHT;

  const themed = {
    dashboard: "var(--primary-background-color, #111111)",
    box: "var(--card-background-color, #1f2a3c)",
    boxBorder: "var(--divider-color, transparent)",
    shadow: "var(--divider-color, #38619b)",
    anchor: "var(--primary-color, #38619b)",
    line: "var(--primary-color, #4369a2)",
    ball: "var(--primary-text-color, #ffffff)",
    graph: "var(--secondary-text-color, #ffffff)",
    text: "var(--primary-text-color, #ffffff)",
    unit: "var(--secondary-text-color, #aaaaaa)",
    gauge: "var(--primary-color, #38619b)",
  };

  // "custom" starts from the theme palette, so only the filled in slots differ.
  const base = mode === "venus" ? preset : themed;

  const resolved = {};
  COLOR_SLOTS.forEach((slot) => {
    const override = config.colors[slot];
    resolved[slot] = isCssColor(override) ? override.trim() : base[slot];
  });

  return resolved;
}

/* ------------------------------------------------------------------ *
 * Configuration normalization
 * ------------------------------------------------------------------ */

function normalizeBackground(raw, legacyPreset) {
  const source = isObject(raw) ? raw : {};
  const background = {
    preset: oneOf(source.preset, BACKGROUND_PRESETS, "theme"),
    color: isPlainString(source.color) ? source.color : "",
    colorLight: isPlainString(source.color_light) ? source.color_light : "",
    from: isPlainString(source.from) ? source.from : "",
    to: isPlainString(source.to) ? source.to : "",
    angle: clamp(numberOr(source.angle, 135), 0, 360),
    image: isPlainString(source.image) ? source.image : "",
    opacity: clamp(numberOr(source.opacity, 100), 0, 100),
    blend: isPlainString(source.blend) ? source.blend : "normal",
    card: boolOr(source.card, true),
    css: isPlainString(source.css) ? source.css : "",
  };
  if (legacyPreset === "venus") {
    background.preset = "solid";
    background.color = background.color || VENUS_DARK.dashboard;
    background.colorLight = background.colorLight || VENUS_LIGHT.dashboard;
  }
  return background;
}

function normalizeColors(raw) {
  const source = isObject(raw) ? raw : {};
  const colors = { mode: oneOf(source.mode, COLOR_MODES, "theme") };
  COLOR_SLOTS.forEach((slot) => {
    colors[slot] = isPlainString(source[slot]) ? source[slot] : "";
  });
  // "venus" is the historical look; keep it reachable through the preset name.
  if (source.preset === "venus") colors.mode = "venus";
  return colors;
}

function normalizeNumbers(raw) {
  const source = isObject(raw) ? raw : {};
  return {
    decimals: normalizeDecimals(source.decimals),
    auto: boolOr(source.auto, DEFAULT_NUMBERS.auto),
    mainOnly: boolOr(source.main_only, DEFAULT_NUMBERS.mainOnly),
    trim: boolOr(source.trim, DEFAULT_NUMBERS.trim),
    missing: isPlainString(source.missing) ? source.missing : DEFAULT_NUMBERS.missing,
  };
}

/**
 * Decimal settings accept three shapes:
 *  - `null` / missing  -> inherit (device setting, then card default)
 *  - `"auto"`          -> Home Assistant display precision
 *  - a number          -> fixed number of decimals
 */
function normalizeDecimals(value) {
  if (value === null || value === undefined || value === "") return null;
  if (isPlainString(value)) {
    const lowered = value.trim().toLowerCase();
    if (lowered === "auto") return "auto";
    if (lowered === "inherit" || lowered === "default") return null;
    if (lowered === "none" || lowered === "raw") return null;
  }
  const parsed = numberOr(value, null);
  if (parsed === null) return null;
  return clamp(Math.round(parsed), 0, 6);
}

function normalizeLinks(raw) {
  const source = isObject(raw) ? raw : {};
  return {
    direction: oneOf(source.direction, LINK_DIRECTIONS, DEFAULT_LINKS.direction),
    curve: oneOf(source.curve, LINK_CURVES, DEFAULT_LINKS.curve),
    speed: clamp(numberOr(source.speed, DEFAULT_LINKS.speed), 1, 100),
    width: clamp(numberOr(source.width, DEFAULT_LINKS.width), 0.5, 12),
    ballSize: clamp(numberOr(source.ball_size, DEFAULT_LINKS.ballSize), 0, 20),
    animate: boolOr(source.animate, DEFAULT_LINKS.animate),
    opacity: clamp(numberOr(source.opacity, DEFAULT_LINKS.opacity), 0, 1),
  };
}

function normalizeLayout(raw, legacyParam) {
  const source = isObject(raw) ? raw : {};
  const columns = Array.isArray(source.columns) ? source.columns : [];
  const legacyColumns = [
    legacyParam.boxCol1,
    legacyParam.boxCol2,
    legacyParam.boxCol3,
  ];
  const resolvedColumns = legacyColumns.map((legacy, index) =>
    clamp(
      Math.round(numberOr(columns[index], numberOr(legacy, DEFAULT_LAYOUT.columns[index]))),
      GRID_COLUMN_LIMITS[index].min,
      GRID_COLUMN_LIMITS[index].max
    )
  );
  return {
    columns: resolvedColumns,
    aspect: clamp(numberOr(source.aspect, DEFAULT_LAYOUT.aspect), 20, 150),
    padding: isPlainString(source.padding) && source.padding.trim() !== ""
      ? source.padding
      : DEFAULT_LAYOUT.padding,
    gap: clamp(numberOr(source.gap, DEFAULT_LAYOUT.gap), 0, 30),
    radius: clamp(numberOr(source.radius, DEFAULT_LAYOUT.radius), 0, 40),
    maxBoxHeight: clamp(
      numberOr(source.max_box_height, DEFAULT_LAYOUT.maxBoxHeight),
      10,
      100
    ),
  };
}

function normalizeTypography(raw, legacyStyles) {
  const source = isObject(raw) ? raw : {};
  const size = (value) => {
    if (isPlainString(value)) {
      const lowered = value.trim().toLowerCase();
      if (lowered === "auto") return "auto";
      const parsed = numberOr(value, null);
      return parsed === null ? "" : `${clamp(parsed, 4, 96)}px`;
    }
    const parsed = numberOr(value, null);
    return parsed === null ? "auto" : `${clamp(parsed, 4, 96)}px`;
  };
  return {
    header: size(source.header ?? legacyStyles.header ?? "auto"),
    sensor: size(source.sensor ?? legacyStyles.sensor ?? "auto"),
    sensor2: size(source.sensor2 ?? legacyStyles.sensor2 ?? "auto"),
    footer: size(source.footer ?? legacyStyles.footer ?? "auto"),
    family: isPlainString(source.family) ? source.family : "",
    headerWeight: clamp(numberOr(source.header_weight, DEFAULT_TYPOGRAPHY.headerWeight), 100, 900),
    sensorWeight: clamp(numberOr(source.sensor_weight, DEFAULT_TYPOGRAPHY.sensorWeight), 100, 900),
    unitScale: clamp(numberOr(source.unit_scale, DEFAULT_TYPOGRAPHY.unitScale), 0.3, 2),
  };
}

/**
 * A device entry can hold up to six entities. Every one of them gets its own
 * decimal setting, falling back to the device setting and then the card default.
 *
 * The main slot deliberately reuses the key of version 1 (`decimals`) so that
 * existing configurations keep working unchanged.
 */
const DECIMAL_SLOTS = [
  { slot: "main", key: "decimals", legacy: "decimals" },
  { slot: "entity2", key: "decimals_entity2", legacy: "entity2Decimals" },
  { slot: "header", key: "decimals_header", legacy: "headerDecimals" },
  { slot: "footer1", key: "decimals_footer1", legacy: "footer1Decimals" },
  { slot: "footer2", key: "decimals_footer2", legacy: "footer2Decimals" },
  { slot: "footer3", key: "decimals_footer3", legacy: "footer3Decimals" },
];

export function decimalSlots() {
  return DECIMAL_SLOTS.map((entry) => ({ ...entry }));
}

function normalizeDevice(key, raw) {
  const source = isObject(raw) ? raw : {};
  const decimals = {};
  DECIMAL_SLOTS.forEach((entry) => {
    const value = source[entry.key] ?? source[entry.legacy];
    decimals[entry.slot] = normalizeDecimals(value);
  });

  const anchors = normalizeAnchors(source.anchors);
  const links = normalizeDeviceLinks(source.link);

  return {
    key,
    icon: isPlainString(source.icon) ? source.icon : "",
    name: isPlainString(source.name) ? source.name : "",
    entity: isPlainString(source.entity) ? source.entity : "",
    entity2: isPlainString(source.entity2) ? source.entity2 : "",
    headerEntity: isPlainString(source.headerEntity) ? source.headerEntity : "",
    footerEntity1: isPlainString(source.footerEntity1) ? source.footerEntity1 : "",
    footerEntity2: isPlainString(source.footerEntity2) ? source.footerEntity2 : "",
    footerEntity3: isPlainString(source.footerEntity3) ? source.footerEntity3 : "",
    gauge: boolOr(source.gauge, false),
    graph: boolOr(source.graph, false),
    decimals,
    anchors,
    links,
  };
}

/** `"L-1, B-2"` becomes `[{ side: "L", qty: 1 }, ...]`. */
export function normalizeAnchors(raw) {
  if (!isPlainString(raw) || raw.trim() === "" || raw.trim() === "nolink") return [];
  return raw
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry !== "" && entry !== "nolink")
    .map((entry) => {
      const [side, qty] = entry.split("-");
      return {
        side: oneOf(side, ["L", "R", "T", "B"], "R"),
        qty: clamp(Math.round(numberOr(qty, 1)), 0, 9),
      };
    })
    .filter((entry) => entry.qty > 0);
}

export function anchorsToString(anchors) {
  return anchors
    .filter((entry) => entry.qty > 0)
    .map((entry) => `${entry.side}-${entry.qty}`)
    .join(", ");
}

function normalizeLinkDirection(source) {
  if (isPlainString(source.direction)) {
    return oneOf(source.direction, LINK_DIRECTIONS, "auto");
  }
  // v1 only knew about the boolean "inv".
  if (boolOr(source.inv, false)) return "reverse";
  return "auto";
}

function normalizeDeviceLinks(raw) {
  if (!isObject(raw)) return [];
  return Object.keys(raw)
    .sort((a, b) => numberOr(a, 0) - numberOr(b, 0))
    .map((key) => {
      const source = isObject(raw[key]) ? raw[key] : {};
      return {
        key,
        start: isPlainString(source.start) ? source.start : "",
        end: isPlainString(source.end) ? source.end : "",
        entity: isPlainString(source.entity) ? source.entity : "",
        direction: normalizeLinkDirection(source),
      };
    })
    .filter((link) => link.start !== "" && link.end !== "");
}

/**
 * Turns any configuration (v1 or v2) into the normalized shape the card uses.
 * Unknown keys are ignored, invalid values fall back to the documented default.
 */
export function normalizeConfig(rawConfig) {
  const config = isObject(rawConfig) ? rawConfig : {};
  const legacyParam = isObject(config.param) ? config.param : {};
  const legacyStyles = isObject(config.styles) ? config.styles : {};

  const devices = {};
  if (isObject(config.devices)) {
    Object.keys(config.devices).forEach((key) => {
      devices[key] = normalizeDevice(key, config.devices[key]);
    });
  }

  const colorsRaw = isObject(config.colors) ? config.colors : {};
  if (config.theme === "venus") colorsRaw.mode = "venus";

  return {
    raw: config,
    type: CARD_TYPE,
    version: VERSION,
    theme: oneOf(config.theme, THEMES, "auto"),
    demo: boolOr(config.demo, false),
    layout: normalizeLayout(config.layout, legacyParam),
    background: normalizeBackground(config.background, config.background_preset),
    colors: normalizeColors(colorsRaw),
    numbers: normalizeNumbers(config.numbers),
    links: normalizeLinks(config.links),
    typography: normalizeTypography(config.typography, legacyStyles),
    customCss: isPlainString(config.custom_css) ? config.custom_css : "",
    devices,
  };
}

/* ------------------------------------------------------------------ *
 * CSS custom properties
 * ------------------------------------------------------------------ */

const px = (value, fallback) => {
  const parsed = numberOr(value, null);
  return parsed === null ? fallback : `${parsed}px`;
};

/**
 * Builds the `--vv-*` custom property map for one theme. The returned object is
 * applied to the card element, so every box, anchor, line and label can be
 * styled from the configuration without writing a single `!important` rule.
 */
export function buildStyleVariables(config, isDark) {
  const colors = resolveColors(config, isDark);
  const background = config.background;
  const variables = {};

  // Background
  let backgroundValue = "var(--card-background-color, var(--primary-background-color, #111111))";
  let backgroundImage = "none";
  switch (background.preset) {
    case "none":
      backgroundValue = "transparent";
      break;
    case "solid":
      backgroundValue =
        (isDark ? background.color : background.colorLight || background.color) ||
        colors.dashboard;
      break;
    case "gradient": {
      const from = background.from || colors.box;
      const to = background.to || colors.dashboard;
      backgroundImage = `linear-gradient(${background.angle}deg, ${from}, ${to})`;
      backgroundValue = "transparent";
      break;
    }
    case "image":
      backgroundImage = background.image
        ? `url("${background.image}")`
        : "none";
      backgroundValue = background.color || colors.dashboard;
      break;
    case "custom":
      backgroundValue = background.color || colors.dashboard;
      backgroundImage = background.image ? `url("${background.image}")` : "none";
      break;
    case "theme":
    default:
      break;
  }

  variables["--vv-dashboard-bg"] = backgroundValue;
  variables["--vv-dashboard-bg-image"] = backgroundImage;
  variables["--vv-dashboard-bg-blend"] = background.blend;
  variables["--vv-dashboard-opacity"] = `${clamp(background.opacity, 0, 100) / 100}`;
  variables["--vv-dashboard-radius"] = px(config.layout.radius, "10px");
  variables["--vv-dashboard-padding"] = config.layout.padding;
  variables["--vv-dashboard-aspect"] = `${config.layout.aspect}%`;
  variables["--vv-column-gap"] = `${config.layout.gap}%`;
  variables["--vv-box-max-height"] = `${config.layout.maxBoxHeight}%`;
  // When the background does not cover the whole card, the card keeps the
  // regular Home Assistant card background behind the dashboard.
  variables["--vv-card-bg"] = background.card
    ? "transparent"
    : "var(--card-background-color, transparent)";

  // Colours
  COLOR_SLOTS.forEach((slot) => {
    variables[`--vv-${slot === "box" ? "box-bg" : slot}`] = colors[slot];
  });

  // Typography
  variables["--vv-font-family"] = config.typography.family
    ? config.typography.family
    : "inherit";
  variables["--vv-font-header"] = config.typography.header;
  variables["--vv-font-sensor"] = config.typography.sensor;
  variables["--vv-font-sensor2"] = config.typography.sensor2;
  variables["--vv-font-footer"] = config.typography.footer;
  variables["--vv-header-weight"] = `${config.typography.headerWeight}`;
  variables["--vv-sensor-weight"] = `${config.typography.sensorWeight}`;
  variables["--vv-unit-scale"] = `${config.typography.unitScale}`;

  // Connection lines
  variables["--vv-line-width"] = `${config.links.width}`;
  variables["--vv-line-opacity"] = `${config.links.opacity}`;

  if (config.customCss) {
    variables["--vv-custom"] = config.customCss;
  }

  return variables;
}

/** True when the given theme name resolves to the dark palette. */
export function resolveIsDark(theme, hassDarkMode) {
  if (theme === "dark") return true;
  if (theme === "light") return false;
  return hassDarkMode !== false;
}

/* ------------------------------------------------------------------ *
 * Number formatting
 * ------------------------------------------------------------------ */

const NUMERIC_STATE = /^-?\d+(?:[.,]\d+)?$/;

/**
 * Home Assistant resolves the precision it displays for an entity in three
 * steps: the user's per entity override, the integration suggestion and its
 * own default. The frontend exposes all three, so we can simply follow it.
 */
export function homeAssistantPrecision(hass, entityId, stateObj) {
  const entry = hass?.entities?.[entityId];
  const fromRegistry = numberOr(entry?.display_precision, null);
  if (fromRegistry !== null) return fromRegistry;
  const attributes = stateObj?.attributes || {};
  const fromAttribute = numberOr(attributes.display_precision, null);
  if (fromAttribute !== null) return fromAttribute;
  const suggested = numberOr(attributes.suggested_display_precision, null);
  return suggested;
}

/**
 * Resolves the effective decimal setting for one entity slot.
 *
 * Order: the entity slot itself, then the device default (which is the value of
 * the device's main slot), then the card default. `numbers.main_only` stops the
 * card default from reaching the secondary entities, which is the filter for
 * "only reformat the main values". `"auto"` at any level asks Home Assistant
 * for the display precision of that entity.
 */
export function resolveDecimals(config, device, slot) {
  const deviceValue = device?.decimals?.[slot];
  const deviceDefault = device?.decimals?.main;

  const explicit = deviceValue ?? (slot === "main" ? null : deviceDefault);
  if (explicit === "auto") return "auto";
  if (typeof explicit === "number") return explicit;
  if (slot !== "main" && config.numbers.mainOnly) return null;

  if (config.numbers.decimals !== null) return config.numbers.decimals;
  return config.numbers.auto ? "auto" : null;
}

/**
 * Formats one entity state for display.
 *
 * Returns `{ value, unit, state, missing }`. Non numeric states are handed back
 * untouched (unless `numericOnly` is disabled) so `on`, `off`, `unavailable`
 * and friends keep working.
 */
export function formatEntityState(hass, entityId, decimals, numbers) {
  const missingText = numbers?.missing ?? DEFAULT_NUMBERS.missing;
  if (!entityId) return { value: "", unit: "", state: "", missing: true };

  const stateObj = hass?.states?.[entityId];
  if (!stateObj) return { value: missingText, unit: "", state: "", missing: true };

  const raw = typeof stateObj.state === "string" ? stateObj.state : `${stateObj.state}`;
  const unit = stateObj.attributes?.unit_of_measurement ?? "";
  const result = { value: raw, unit, state: raw, missing: false };

  if (!NUMERIC_STATE.test(raw.trim())) return result;

  const numeric = parseFloat(raw.replace(",", "."));
  if (!Number.isFinite(numeric)) return result;

  const precision =
    decimals === "auto" ? homeAssistantPrecision(hass, entityId, stateObj) : decimals;
  if (precision === null || precision === undefined) return result;

  let formatted = numeric.toFixed(clamp(Math.round(precision), 0, 6));
  if (numbers?.trim) {
    formatted = formatted.includes(".")
      ? formatted.replace(/0+$/, "").replace(/\.$/, "")
      : formatted;
  }
  return { ...result, value: formatted };
}

/* ------------------------------------------------------------------ *
 * Stub / default configuration
 * ------------------------------------------------------------------ */

const GRID_TESTS = ["grid", "utility", "net", "meter"];
const SOLAR_TESTS = ["solar", "pv", "photovoltaic", "inverter"];
const BATTERY_TESTS = ["battery"];
const BATTERY_PERCENT_TESTS = [
  "battery_percent",
  "battery_level",
  "state_of_charge",
  "soc",
  "percentage",
];

function matches(stateObj, entityId, needles) {
  const friendly = stateObj?.attributes?.friendly_name || "";
  return needles.some((needle) => entityId.includes(needle) || friendly.includes(needle));
}

/** Builds the "add card" preview configuration from the entities of an instance. */
export function getStubConfig(hass) {
  const states = hass?.states || {};
  const ids = Object.keys(states);

  const byUnit = (unit) => ids.filter((id) => states[id]?.attributes?.unit_of_measurement === unit);
  const power = ids.filter((id) => {
    const stateObj = states[id];
    return stateObj?.attributes?.device_class === "power" || id.includes("power");
  });

  const grid = power.find((id) => matches(states[id], id, GRID_TESTS)) ?? "";
  const solar = power.find((id) => matches(states[id], id, SOLAR_TESTS)) ?? "";
  const batteryPercent =
    byUnit("%").find((id) => matches(states[id], id, BATTERY_PERCENT_TESTS)) ?? "";
  const batteryCurrent =
    byUnit("A").find((id) => matches(states[id], id, BATTERY_TESTS)) ?? "";

  return {
    theme: "auto",
    layout: { columns: [2, 1, 2] },
    numbers: { decimals: 0 },
    devices: {
      "1-1": {
        icon: "mdi:transmission-tower",
        name: "Grid",
        entity: grid,
        anchors: "R-1",
        link: { 1: { start: "R-1", end: "2-1_L-1" } },
      },
      "1-2": {
        icon: "mdi:battery-charging",
        name: "Battery",
        entity: batteryPercent,
        anchors: "R-1",
        gauge: true,
        link: {
          1: { start: "R-1", end: "2-1_B-1", entity: batteryCurrent, direction: "auto" },
        },
      },
      "2-1": {
        icon: "mdi:cellphone-charging",
        name: "Multiplus",
        anchors: "L-1, B-2, R-1",
      },
      "3-1": {
        icon: "mdi:home-lightning-bolt",
        name: "Home",
        entity: grid,
        anchors: "L-1",
        link: { 1: { start: "L-1", end: "2-1_R-1" } },
      },
      "3-2": {
        icon: "mdi:weather-sunny",
        name: "Solar",
        entity: solar,
        anchors: "L-1",
        link: { 1: { start: "L-1", end: "2-1_B-2", entity: solar, direction: "reverse" } },
      },
    },
  };
}
