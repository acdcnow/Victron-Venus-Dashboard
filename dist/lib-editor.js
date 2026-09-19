/*
 * Victron Venus Dashboard - visual editor.
 *
 * The editor is schema driven: every option is described once as a descriptor
 * (`key`, `label`, `selector`, `read`, `write`) and rendered with `ha-form`.
 * That keeps the editor and the card configuration in sync by construction and
 * gives the card the same look and feel as the Home Assistant card editors.
 */

import {
    BACKGROUND_PRESETS,
    COLOR_MODES,
    COLOR_SLOTS,
    GRID_COLUMN_LIMITS,
    LINK_CURVES,
    LINK_DIRECTIONS,
    THEMES,
    anchorsToString,
    boolOr,
    clamp,
    decimalSlots,
    deletePath,
    getPath,
    normalizeConfig,
    numberOr,
    setPath,
} from "./lib-config.js";
import { COLOR_FIELD_TYPE } from "./color-field.js";

/* ------------------------------------------------------------------ *
 * Translations
 * ------------------------------------------------------------------ */

let translations = {};
let currentLanguage = "";

export async function loadTranslations(hass, force = false) {
    const language = hass?.language || "en";
    if (!force && language === currentLanguage && Object.keys(translations).length > 0) {
        return translations;
    }
    currentLanguage = language;
    try {
        const module = await import(`./lang-${language}.js`);
        translations = module.default;
    } catch (error) {
        console.warn(`Victron Venus dashboard: no translation for "${language}".`, error);
        const fallback = await import("./lang-en.js");
        translations = fallback.default;
    }
    return translations;
}

/** Returns the translation for `group.key`, or a visible marker when missing. */
export function t(group, key) {
    const value = translations?.[group]?.[key];
    return value === undefined ? `⚠️ ${group}.${key}` : value;
}

function localize(group, key, fallback) {
    const value = translations?.[group]?.[key];
    return value === undefined ? fallback : value;
}

/**
 * Schema names are derived from the option they edit, which keeps the schema
 * readable, but the per entity fields would need a translation each. They are
 * mapped back onto their generic label instead.
 */
function labelKey(name) {
    if (name.startsWith("decimals_")) return "decimals";
    if (name.startsWith("footer_")) return "footer_entity";
    if (name.startsWith("link_")) {
        const parts = name.split("_");
        return `link_${parts[parts.length - 1]}`;
    }
    return name;
}

/* ------------------------------------------------------------------ *
 * Descriptor helpers
 * ------------------------------------------------------------------ */

const select = (options) => ({ select: { mode: "dropdown", options } });
const numberBox = (min, max, step = 1, unit) => ({
    number: {
        min,
        max,
        step,
        mode: "box",
        ...(unit ? { unit_of_measurement: unit } : {}),
    },
});
const TRUTHY = ["true", "yes", "on", "1"];

/** Reads a config path, applying `transform` to the raw value. */
const read = (config, path, transform) => {
    const value = getPath(config, path);
    return transform ? transform(value) : value;
};

/**
 * Writes a config path. Empty values remove the key entirely, so the card
 * configuration stays clean and the defaults keep working.
 */
const write = (config, path, value, transform) => {
    const resolved = transform ? transform(value) : value;
    if (resolved === undefined || resolved === null || resolved === "") {
        deletePath(config, path);
        return config;
    }
    return setPath(config, path, resolved);
};

const toNumberOrUndefined = (value) => {
    const parsed = numberOr(value, null);
    return parsed === null ? undefined : parsed;
};

/** Decimals are stored as `null` (inherit), `"auto"` or a number. */
const decimalsToConfig = (value) => {
    if (value === undefined || value === null || value === "" || value === "inherit") {
        return undefined;
    }
    if (value === "auto") return "auto";
    const parsed = numberOr(value, null);
    return parsed === null ? undefined : clamp(Math.round(parsed), 0, 6);
};

const decimalsFromConfig = (value) => {
    if (value === "auto") return "auto";
    if (typeof value === "number") return `${value}`;
    return "inherit";
};

const decimalsSelector = () =>
    select([
        { value: "inherit", label: t("options", "decimals_inherit") },
        { value: "auto", label: t("options", "decimals_auto") },
        ...[0, 1, 2, 3, 4, 5, 6].map((value) => ({ value: `${value}`, label: `${value}` })),
    ]);

const text = (multiline) => (multiline ? { text: { multiline: true } } : { text: {} });
const boolean = () => ({ boolean: {} });

/**
 * A colour option. `kind` moves the field out of `ha-form`, because a colour is
 * much easier to set with the graphical picker and `ha-form` has none. The
 * selector stays a text one, so the descriptor keeps working everywhere else.
 */
const color = (key, path) => ({
    key,
    kind: "color",
    selector: text(),
    read: (config) => read(config, path),
    write: (config, value) => write(config, path, value),
});

/** Line shape per connection: inherit the card setting, or force one. */
const curveSelector = () =>
    select([
        { value: "inherit", label: t("options", "curve_inherit") },
        ...LINK_CURVES.map((value) => ({ value, label: t("options", `curve_${value}`) })),
    ]);

function directionSelector() {
    return select(
        LINK_DIRECTIONS.map((value) => ({
            value,
            label: t("options", `direction_${value}`),
        }))
    );
}

/* ------------------------------------------------------------------ *
 * Section descriptors
 * ------------------------------------------------------------------ */

const SLOT_LABELS = {
    dashboard: "color_dashboard",
    box: "color_box",
    boxBorder: "color_box_border",
    shadow: "color_shadow",
    anchor: "color_anchor",
    line: "color_line",
    ball: "color_ball",
    graph: "color_graph",
    text: "color_text",
    unit: "color_unit",
    gauge: "color_gauge",
};

/** Builds the descriptors of one card level section. */
function cardSectionDescriptors(sectionId) {
    switch (sectionId) {
        case "general":
            return [
                {
                    key: "theme",
                    selector: select(
                        THEMES.map((value) => ({ value, label: t("options", `theme_${value}`) }))
                    ),
                    read: (config) => config.theme ?? "auto",
                    write: (config, value) => write(config, "theme", value),
                },
                {
                    key: "demo",
                    selector: boolean(),
                    read: (config) => boolOr(getPath(config, "demo"), false),
                    write: (config, value) =>
                        write(config, "demo", value === true ? true : undefined),
                },
                ...[0, 1, 2].map((index) => ({
                    key: `columns_${index + 1}`,
                    selector: numberBox(
                        GRID_COLUMN_LIMITS[index].min,
                        GRID_COLUMN_LIMITS[index].max
                    ),
                    read: (config) =>
                        getPath(config, "layout.columns", undefined)?.[index] ??
                        numberOr(getPath(config, `param.boxCol${index + 1}`), 1),
                    write: (config, value) => {
                        const columns = [
                            ...(getPath(config, "layout.columns", undefined) || []),
                        ];
                        const parsed = numberOr(value, null);
                        if (parsed === null) {
                            delete columns[index];
                        } else {
                            columns[index] = clamp(
                                Math.round(parsed),
                                GRID_COLUMN_LIMITS[index].min,
                                GRID_COLUMN_LIMITS[index].max
                            );
                        }
                        if (columns.filter((entry) => entry !== undefined).length === 0) {
                            deletePath(config, "layout.columns");
                        } else {
                            setPath(config, "layout.columns", columns);
                        }
                        deletePath(config, `param.boxCol${index + 1}`);
                        return config;
                    },
                })),
                {
                    key: "aspect",
                    selector: numberBox(20, 150, 5, "%"),
                    read: (config) => read(config, "layout.aspect", toNumberOrUndefined),
                    write: (config, value) => write(config, "layout.aspect", value, toNumberOrUndefined),
                },
                {
                    key: "radius",
                    selector: numberBox(0, 40, 1, "px"),
                    read: (config) => read(config, "layout.radius", toNumberOrUndefined),
                    write: (config, value) => write(config, "layout.radius", value, toNumberOrUndefined),
                },
                {
                    key: "gap",
                    selector: numberBox(0, 30, 1, "%"),
                    read: (config) => read(config, "layout.gap", toNumberOrUndefined),
                    write: (config, value) => write(config, "layout.gap", value, toNumberOrUndefined),
                },
                {
                    key: "max_box_height",
                    selector: numberBox(10, 100, 5, "%"),
                    read: (config) => read(config, "layout.max_box_height", toNumberOrUndefined),
                    write: (config, value) =>
                        write(config, "layout.max_box_height", value, toNumberOrUndefined),
                },
                {
                    key: "padding",
                    selector: text(),
                    read: (config) => read(config, "layout.padding"),
                    write: (config, value) => write(config, "layout.padding", value),
                },
            ];

        case "background":
            return [
                {
                    key: "background_preset",
                    selector: select(
                        BACKGROUND_PRESETS.map((value) => ({
                            value,
                            label: t("options", `background_${value}`),
                        }))
                    ),
                    read: (config) => getPath(config, "background.preset", "theme"),
                    write: (config, value) => write(config, "background.preset", value),
                },
                color("background_color", "background.color"),
                color("background_color_light", "background.color_light"),
                color("background_from", "background.from"),
                color("background_to", "background.to"),
                {
                    key: "background_angle",
                    selector: numberBox(0, 360, 5, "°"),
                    read: (config) => read(config, "background.angle", toNumberOrUndefined),
                    write: (config, value) => write(config, "background.angle", value, toNumberOrUndefined),
                },
                {
                    key: "background_opacity",
                    selector: numberBox(0, 100, 5, "%"),
                    read: (config) => read(config, "background.opacity", toNumberOrUndefined),
                    write: (config, value) => write(config, "background.opacity", value, toNumberOrUndefined),
                },
                {
                    key: "background_image",
                    selector: text(),
                    read: (config) => read(config, "background.image"),
                    write: (config, value) => write(config, "background.image", value),
                },
                {
                    key: "background_blend",
                    selector: text(),
                    read: (config) => read(config, "background.blend"),
                    write: (config, value) => write(config, "background.blend", value),
                },
                {
                    key: "background_card",
                    selector: boolean(),
                    read: (config) => boolOr(getPath(config, "background.card"), true),
                    // An absent key means "on", so the off state has to be stored.
                    write: (config, value) =>
                        write(config, "background.card", value === false ? false : undefined),
                },
                {
                    key: "background_css",
                    selector: text(true),
                    read: (config) => read(config, "background.css"),
                    write: (config, value) => write(config, "background.css", value),
                },
            ];

        case "colors":
            return [
                {
                    key: "colors_mode",
                    selector: select(
                        COLOR_MODES.map((value) => ({
                            value,
                            label: t("options", `colors_${value}`),
                        }))
                    ),
                    read: (config) => getPath(config, "colors.mode", "theme"),
                    write: (config, value) => write(config, "colors.mode", value),
                },
                ...COLOR_SLOTS.map((slot) => color(`color_${slot}`, `colors.${slot}`)),
            ];

        case "numbers":
            return [
                {
                    key: "numbers_decimals",
                    selector: numberBox(0, 6),
                    read: (config) => read(config, "numbers.decimals", toNumberOrUndefined),
                    write: (config, value) => {
                        if (value === "" || value === undefined || value === null) {
                            deletePath(config, "numbers.decimals");
                            return config;
                        }
                        return write(config, "numbers.decimals", value, decimalsToConfig);
                    },
                },
                {
                    key: "numbers_auto",
                    selector: boolean(),
                    read: (config) => boolOr(getPath(config, "numbers.auto"), false),
                    write: (config, value) =>
                        write(config, "numbers.auto", value === true ? true : undefined),
                },
                {
                    key: "numbers_main_only",
                    selector: boolean(),
                    read: (config) => boolOr(getPath(config, "numbers.main_only"), false),
                    write: (config, value) =>
                        write(config, "numbers.main_only", value === true ? true : undefined),
                },
                {
                    key: "numbers_trim",
                    selector: boolean(),
                    read: (config) => boolOr(getPath(config, "numbers.trim"), false),
                    write: (config, value) =>
                        write(config, "numbers.trim", value === true ? true : undefined),
                },
                {
                    key: "numbers_missing",
                    selector: text(),
                    read: (config) => read(config, "numbers.missing"),
                    write: (config, value) => write(config, "numbers.missing", value),
                },
            ];

        case "links":
            return [
                {
                    key: "links_direction",
                    selector: directionSelector(),
                    read: (config) => getPath(config, "links.direction", "auto"),
                    write: (config, value) => write(config, "links.direction", value),
                },
                {
                    key: "links_curve",
                    selector: select(
                        LINK_CURVES.map((value) => ({
                            value,
                            label: t("options", `curve_${value}`),
                        }))
                    ),
                    read: (config) => getPath(config, "links.curve", "auto"),
                    write: (config, value) => write(config, "links.curve", value),
                },
                {
                    key: "links_animate",
                    selector: boolean(),
                    read: (config) => boolOr(getPath(config, "links.animate"), true),
                    write: (config, value) =>
                        write(config, "links.animate", value === false ? false : undefined),
                },
                {
                    key: "links_speed",
                    selector: numberBox(1, 100, 1),
                    read: (config) => read(config, "links.speed", toNumberOrUndefined),
                    write: (config, value) => write(config, "links.speed", value, toNumberOrUndefined),
                },
                {
                    key: "links_width",
                    selector: numberBox(0.5, 12, 0.5, "px"),
                    read: (config) => read(config, "links.width", toNumberOrUndefined),
                    write: (config, value) => write(config, "links.width", value, toNumberOrUndefined),
                },
                {
                    key: "links_ball_size",
                    selector: numberBox(0, 20, 1, "px"),
                    read: (config) => read(config, "links.ball_size", toNumberOrUndefined),
                    write: (config, value) => write(config, "links.ball_size", value, toNumberOrUndefined),
                },
                {
                    key: "links_opacity",
                    selector: numberBox(0, 1, 0.05),
                    read: (config) => read(config, "links.opacity", toNumberOrUndefined),
                    write: (config, value) => write(config, "links.opacity", value, toNumberOrUndefined),
                },
            ];

        case "typography":
            return [
                ...["header", "sensor", "sensor2", "footer"].map((kind) => ({
                    key: `font_${kind}`,
                    selector: text(),
                    read: (config) => {
                        const value = getPath(config, `typography.${kind}`);
                        if (value !== undefined) return value;
                        const legacy = getPath(config, `styles.${kind}`);
                        return legacy === undefined ? "" : `${legacy}`;
                    },
                    write: (config, value) => {
                        deletePath(config, `styles.${kind}`);
                        return write(config, `typography.${kind}`, value);
                    },
                })),
                {
                    key: "font_family",
                    selector: text(),
                    read: (config) => read(config, "typography.family"),
                    write: (config, value) => write(config, "typography.family", value),
                },
                {
                    key: "sensor_weight",
                    selector: select(
                        [300, 400, 500, 600, 700].map((value) => ({
                            value,
                            label: `${value}`,
                        }))
                    ),
                    read: (config) => getPath(config, "typography.sensor_weight", 400),
                    write: (config, value) => write(config, "typography.sensor_weight", value, toNumberOrUndefined),
                },
                {
                    key: "header_weight",
                    selector: select(
                        [300, 400, 500, 600, 700].map((value) => ({
                            value,
                            label: `${value}`,
                        }))
                    ),
                    read: (config) => getPath(config, "typography.header_weight", 400),
                    write: (config, value) => write(config, "typography.header_weight", value, toNumberOrUndefined),
                },
                {
                    key: "unit_scale",
                    selector: numberBox(0.3, 2, 0.1),
                    read: (config) => read(config, "typography.unit_scale", toNumberOrUndefined),
                    write: (config, value) => write(config, "typography.unit_scale", value, toNumberOrUndefined),
                },
            ];

        case "graphs":
            return [
                {
                    key: "graphs_hours",
                    selector: numberBox(1, 168, 1, "h"),
                    read: (config) => read(config, "graphs.hours", toNumberOrUndefined),
                    write: (config, value) => write(config, "graphs.hours", value, toNumberOrUndefined),
                },
                {
                    key: "graphs_refresh",
                    selector: numberBox(1, 1440, 1, "min"),
                    read: (config) => read(config, "graphs.refresh", toNumberOrUndefined),
                    write: (config, value) => write(config, "graphs.refresh", value, toNumberOrUndefined),
                },
                {
                    key: "graphs_segments",
                    selector: numberBox(1, 24, 1),
                    read: (config) => read(config, "graphs.segments", toNumberOrUndefined),
                    write: (config, value) => write(config, "graphs.segments", value, toNumberOrUndefined),
                },
            ];

        case "advanced":
            return [
                {
                    key: "custom_css",
                    selector: text(true),
                    read: (config) => read(config, "custom_css"),
                    write: (config, value) => write(config, "custom_css", value),
                },
            ];

        default:
            return [];
    }
}

export const CARD_SECTIONS = [
    { id: "general", icon: "mdi:cog" },
    { id: "background", icon: "mdi:image-outline" },
    { id: "colors", icon: "mdi:palette" },
    { id: "numbers", icon: "mdi:decimal" },
    { id: "links", icon: "mdi:vector-polyline" },
    { id: "typography", icon: "mdi:format-font" },
    { id: "graphs", icon: "mdi:chart-line" },
    { id: "advanced", icon: "mdi:code-tags" },
];

/* ------------------------------------------------------------------ *
 * Device descriptors
 * ------------------------------------------------------------------ */

function deviceDescriptors(boxKey) {
    const base = `devices.${boxKey}`;
    const slots = decimalSlots();

    const decimals = slots.map((entry) => ({
        key: `decimals_${entry.slot}`,
        selector: decimalsSelector(),
        read: (config) => decimalsFromConfig(getPath(config, `${base}.${entry.key}`) ?? getPath(config, `${base}.${entry.legacy}`)),
        write: (config, value) => {
            deletePath(config, `${base}.${entry.legacy}`);
            return write(config, `${base}.${entry.key}`, value, decimalsToConfig);
        },
    }));

    return [
        {
            key: "icon",
            selector: { icon: {} },
            read: (config) => read(config, `${base}.icon`),
            write: (config, value) => write(config, `${base}.icon`, value),
        },
        {
            key: "name",
            selector: text(),
            read: (config) => read(config, `${base}.name`),
            write: (config, value) => write(config, `${base}.name`, value),
        },
        {
            key: "entity",
            selector: { entity: {} },
            read: (config) => read(config, `${base}.entity`),
            write: (config, value) => write(config, `${base}.entity`, value),
        },
        decimals[0],
        {
            key: "entity2",
            selector: { entity: {} },
            read: (config) => read(config, `${base}.entity2`),
            write: (config, value) => write(config, `${base}.entity2`, value),
        },
        decimals[1],
        {
            key: "graph",
            selector: boolean(),
            read: (config) => boolOr(getPath(config, `${base}.graph`), false),
            write: (config, value) => write(config, `${base}.graph`, value === true ? true : undefined),
        },
        {
            key: "gauge",
            selector: boolean(),
            read: (config) => boolOr(getPath(config, `${base}.gauge`), false),
            write: (config, value) => write(config, `${base}.gauge`, value === true ? true : undefined),
        },
        {
            key: "header_entity",
            selector: { entity: {} },
            read: (config) => read(config, `${base}.headerEntity`),
            write: (config, value) => write(config, `${base}.headerEntity`, value),
        },
        decimals[2],
        ...[1, 2, 3].flatMap((index) => [
            {
                key: `footer_${index}`,
                selector: { entity: {} },
                read: (config) => read(config, `${base}.footerEntity${index}`),
                write: (config, value) => write(config, `${base}.footerEntity${index}`, value),
            },
            decimals[index + 2],
        ]),
        ...["left", "top", "bottom", "right"].map((side) => ({
            key: `anchor_${side}`,
            selector: numberBox(0, 9),
            read: (config) => {
                const anchors = normalizeConfig(config).devices[boxKey]?.anchors || [];
                const found = anchors.find((anchor) => anchor.side === side[0].toUpperCase());
                return found ? found.qty : 0;
            },
            write: (config, value) => {
                const normalized = normalizeConfig(config).devices[boxKey];
                const anchors = (normalized?.anchors || []).filter(
                    (anchor) => anchor.side !== side[0].toUpperCase()
                );
                const qty = clamp(Math.round(numberOr(value, 0)), 0, 9);
                if (qty > 0) anchors.push({ side: side[0].toUpperCase(), qty });
                anchors.sort((a, b) => a.side.localeCompare(b.side));
                const asString = anchorsToString(anchors);
                return asString === ""
                    ? deletePath(config, `${base}.anchors`)
                    : setPath(config, `${base}.anchors`, asString);
            },
        })),
    ];
}

/* ------------------------------------------------------------------ *
 * Link descriptors
 * ------------------------------------------------------------------ */

export function anchorOptions(config, boxKey, includeSelf) {
    const normalized = normalizeConfig(config);
    const options = [];

    Object.values(normalized.devices).forEach((device) => {
        const own = device.key === boxKey;
        if (!includeSelf && own) return;
        if (includeSelf && !own) return;
        device.anchors.forEach(({ side, qty }) => {
            for (let i = 1; i <= qty; i += 1) {
                options.push({
                    value: `${device.key}_${side}-${i}`,
                    label: `${device.key} · ${side}-${i}`,
                });
            }
        });
    });

    return options;
}

function linkDescriptors(boxKey, index) {
    const base = `devices.${boxKey}.link.${index}`;
    return [
        {
            key: `link_${index}_start`,
            selector: select(anchorOptionsFor(boxKey, true)),
            read: (config) => read(config, `${base}.start`),
            write: (config, value) => write(config, `${base}.start`, value),
        },
        {
            key: `link_${index}_end`,
            selector: select(anchorOptionsFor(boxKey, false)),
            read: (config) => read(config, `${base}.end`),
            write: (config, value) => write(config, `${base}.end`, value),
        },
        {
            key: `link_${index}_entity`,
            selector: { entity: {} },
            read: (config) => read(config, `${base}.entity`),
            write: (config, value) => write(config, `${base}.entity`, value),
        },
        {
            key: `link_${index}_direction`,
            selector: directionSelector(),
            read: (config) => {
                const value = getPath(config, `${base}.direction`);
                if (value !== undefined) return value;
                return boolOr(getPath(config, `${base}.inv`), false) ? "reverse" : "auto";
            },
            write: (config, value) => {
                deletePath(config, `${base}.inv`);
                return write(config, `${base}.direction`, value);
            },
        },
        {
            key: `link_${index}_curve`,
            selector: curveSelector(),
            read: (config) => getPath(config, `${base}.curve`, "inherit"),
            write: (config, value) =>
                write(config, `${base}.curve`, value === "inherit" ? undefined : value),
        },
    ];
}

/**
 * Anchor dropdown options. The anchor lists depend on the current configuration,
 * so they are resolved while the schema is built (see `buildSchema`).
 */
let anchorProvider = () => [];
export function setAnchorProvider(provider) {
    anchorProvider = provider;
}
function anchorOptionsFor(boxKey, self) {
    return anchorProvider(boxKey, self);
}

/* ------------------------------------------------------------------ *
 * Schema builder
 * ------------------------------------------------------------------ */

function toSchema(descriptors) {
    return descriptors.map((descriptor) => ({
        name: descriptor.key,
        selector: descriptor.selector,
        required: descriptor.required ?? false,
    }));
}

export function buildSchema(descriptors) {
    return toSchema(descriptors);
}

export function formData(config, descriptors) {
    const data = {};
    descriptors.forEach((descriptor) => {
        data[descriptor.key] = descriptor.read(config);
    });
    return data;
}

export function applyFormData(config, descriptors, data) {
    const next = JSON.parse(JSON.stringify(config ?? {}));
    descriptors.forEach((descriptor) => {
        const value = data[descriptor.key];
        const original = descriptor.read(config);
        if (`${value}` === `${original}`) return;
        descriptor.write(next, value);
    });
    return next;
}

export const cardDescriptors = cardSectionDescriptors;
export { deviceDescriptors, linkDescriptors };

/* ------------------------------------------------------------------ *
 * Config pruning
 * ------------------------------------------------------------------ */

function isPlainObject(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Removes boxes and connections that have no settings left. This is what makes
 * the editor able to delete a box again: clear every field and the entry is
 * gone, while the box itself stays part of the column layout.
 */
export function pruneConfig(config) {
    if (!isPlainObject(config) || !isPlainObject(config.devices)) return config;

    Object.keys(config.devices).forEach((boxKey) => {
        const device = config.devices[boxKey];
        if (!isPlainObject(device)) return;

        if (isPlainObject(device.link)) {
            Object.keys(device.link).forEach((index) => {
                if (isPlainObject(device.link[index]) && Object.keys(device.link[index]).length === 0) {
                    delete device.link[index];
                }
            });
            if (Object.keys(device.link).length === 0) delete device.link;
        }

        if (Object.keys(device).length === 0) delete config.devices[boxKey];
    });

    if (Object.keys(config.devices).length === 0) delete config.devices;
    return config;
}

/* ------------------------------------------------------------------ *
 * Rendering
 * ------------------------------------------------------------------ */

function expansionPanel(id, titleKey, icon, content) {
    const panel = document.createElement("ha-expansion-panel");
    panel.id = id;
    panel.setAttribute("outlined", "");

    const header = document.createElement("div");
    header.slot = "header";
    header.className = "row-header";
    header.innerHTML = `<ha-icon icon="${icon}"></ha-icon><span>${t("sections", titleKey)}</span>`;
    panel.appendChild(header);

    const wrapper = document.createElement("div");
    wrapper.className = "panel-content";
    wrapper.appendChild(content);
    panel.appendChild(wrapper);

    return panel;
}

/**
 * Renders the colour options of a section. They get their own fields, because
 * `ha-form` has no graphical picker and picking a colour by hand is tedious.
 */
function colorFields(editor, descriptors, config, onChange) {
    const grid = document.createElement("div");
    grid.className = "color-grid";

    descriptors.forEach((descriptor) => {
        const key = labelKey(descriptor.key);
        const field = document.createElement(COLOR_FIELD_TYPE);
        field.setAttribute("data-key", descriptor.key);
        field.label = localize("fields", key, t("fields", key));
        // A slot specific hint wins, otherwise the generic explanation.
        field.helper =
            localize("helpers", key, "") || localize("helpers", "color_value", "");
        field.clearLabel = t("actions", "clear_color");
        field.value = descriptor.read(config);
        field.addEventListener("value-changed", (event) => {
            event.stopPropagation();
            onChange(
                applyFormData(editor._config, [descriptor], {
                    [descriptor.key]: event.detail.value,
                })
            );
        });
        grid.appendChild(field);
    });

    return grid;
}

/**
 * Builds the fields of one panel: a `ha-form` for everything and the colour
 * pickers for the colour options.
 */
function createForm(editor, descriptors, config, onChange, extraClass) {
    const colors = descriptors.filter((descriptor) => descriptor.kind === "color");
    const rest = descriptors.filter((descriptor) => descriptor.kind !== "color");

    const wrapper = document.createElement("div");
    wrapper.className = "field-set";

    if (colors.length > 0) {
        wrapper.appendChild(colorFields(editor, colors, config, onChange));
    }

    if (rest.length > 0) {
        const form = document.createElement("ha-form");
        if (extraClass) form.className = extraClass;
        form.hass = editor._hass;
        form.data = formData(config, rest);
        form.schema = buildSchema(rest);
        form.computeLabel = (schema) => {
            const key = labelKey(schema.name);
            // `t` returns a visible marker for a missing key, so a forgotten
            // translation shows up in the UI and in the tests instead of silently
            // falling back to the schema name.
            return localize("fields", key, t("fields", key));
        };
        form.computeHelper = (schema) =>
            localize("helpers", labelKey(schema.name), "") || undefined;
        form.addEventListener("value-changed", (event) => {
            event.stopPropagation();
            // Always write into the configuration the editor holds right now:
            // the one of the moment this field was built is only a snapshot, and
            // writing into it would silently drop what other panels changed.
            onChange(applyFormData(editor._config, rest, event.detail.value));
        });
        wrapper.appendChild(form);
    }

    return wrapper;
}

/** Renders the "Card" tab: one expansion panel per configuration section. */
export function renderCardTab(editor, container) {
    const fragments = CARD_SECTIONS.map((section) => {
        const descriptors = cardDescriptors(section.id);
        if (descriptors.length === 0) return null;
        const form = createForm(editor, descriptors, editor._config, (next) =>
            editor._commit(next)
        );
        return expansionPanel(
            `panel_${section.id}`,
            section.id,
            section.icon,
            form
        );
    }).filter(Boolean);

    container.append(...fragments);
}

/** Renders one column tab: a sub tab per box, then the device forms. */
export function renderColumnTab(editor, container, column) {
    const boxCount = editor.columns[column - 1] ?? 1;

    const group = document.createElement("ha-tab-group");
    for (let i = 1; i <= boxCount; i += 1) {
        const tab = document.createElement("ha-tab-group-tab");
        tab.slot = "nav";
        tab.setAttribute("panel", `${column}-${i}`);
        tab.active = editor._box === `${column}-${i}`;
        tab.textContent = `${column}-${i}`;
        tab.addEventListener("click", () => {
            editor._box = `${column}-${i}`;
            editor._render();
        });
        group.appendChild(tab);
    }
    container.appendChild(group);

    const boxKey = editor._box && editor._box.startsWith(`${column}-`) ? editor._box : `${column}-1`;
    editor._box = boxKey;

    const content = document.createElement("div");
    content.className = "editor";
    container.appendChild(content);

    // Every box of the layout is editable, even when it has no settings yet:
    // filling in a field creates the device entry, so no YAML round trip is
    // needed to add a box. Clearing every field removes it again (see
    // `pruneConfig`).
    const device = normalizeConfig(editor._config).devices[boxKey];
    if (!device) {
        const hint = document.createElement("div");
        hint.className = "empty-hint";
        hint.textContent = t("messages", "device_empty");
        content.appendChild(hint);
    }

    // Header, main sensors, header/footer sensors, anchors
    const descriptors = deviceDescriptors(boxKey);
    const groups = [
        { id: "device_header", title: "device_header_title", icon: "mdi:tag-outline", keys: ["icon", "name"] },
        {
            id: "device_sensors",
            title: "device_sensors_title",
            icon: "mdi:gauge",
            keys: ["entity", "decimals_main", "entity2", "decimals_entity2", "graph", "gauge"],
        },
        {
            id: "device_extra",
            title: "device_extra_title",
            icon: "mdi:format-list-bulleted",
            keys: [
                "header_entity",
                "decimals_header",
                "footer_1",
                "decimals_footer1",
                "footer_2",
                "decimals_footer2",
                "footer_3",
                "decimals_footer3",
            ],
        },
        {
            id: "device_anchors",
            title: "device_anchors_title",
            icon: "mdi:vector-square",
            keys: ["anchor_left", "anchor_top", "anchor_bottom", "anchor_right"],
        },
    ];

    groups.forEach((group_) => {
        const subset = descriptors.filter((descriptor) => group_.keys.includes(descriptor.key));
        if (subset.length === 0) return;
        const form = createForm(editor, subset, editor._config, (next) => editor._commit(next));
        content.appendChild(expansionPanel(group_.id, group_.title, group_.icon, form));
    });

    content.appendChild(renderLinks(editor, boxKey, rawLinks(editor._config, boxKey)));
}

/** Next free link index, so removing a link never causes a collision. */
function nextLinkIndex(links) {
    return (
        links.reduce((max, link) => Math.max(max, Math.round(numberOr(link.key, 0))), 0) + 1
    );
}

/**
 * Lists the configured links of a device straight from the configuration.
 * A link that is still missing its anchors is not drawn on the card, but it has
 * to stay visible (and editable) in the editor.
 */
function rawLinks(config, boxKey) {
    const raw = getPath(config, `devices.${boxKey}.link`);
    if (!raw || typeof raw !== "object") return [];
    return Object.keys(raw)
        .sort((a, b) => numberOr(a, 0) - numberOr(b, 0))
        .map((key) => ({ key, ...(typeof raw[key] === "object" ? raw[key] : {}) }));
}

/** Renders the per device list of connection lines. */
function renderLinks(editor, boxKey, links) {
    const wrapper = document.createElement("div");
    wrapper.className = "editor";

    setAnchorProvider((targetBox, self) => anchorOptions(editor._config, targetBox, self));

    const header = document.createElement("div");
    header.className = "link-header";
    header.innerHTML = `<span class="link-title">${t("sections", "links_title")}</span>`;
    const addButton = document.createElement("ha-button");
    addButton.setAttribute("appearance", "plain");
    addButton.innerHTML = `<ha-icon icon="mdi:plus"></ha-icon>${t("actions", "add_link")}`;
    addButton.addEventListener("click", () => {
        const config = JSON.parse(JSON.stringify(editor._config ?? {}));
        // Prefill the first free anchors, otherwise the new link would not be
        // drawn on the card until both ends have been picked.
        const start = anchorOptions(config, boxKey, true)[0]?.value ?? "";
        const end = anchorOptions(config, boxKey, false)[0]?.value ?? "";
        setPath(config, `devices.${boxKey}.link.${nextLinkIndex(links)}`, { start, end });
        editor._commit(config, true);
    });
    header.appendChild(addButton);
    wrapper.appendChild(header);

    if (links.length === 0) {
        const hint = document.createElement("div");
        hint.className = "empty-hint";
        hint.textContent = t("messages", "no_links");
        wrapper.appendChild(hint);
        return wrapper;
    }

    links.forEach((link) => {
        const panel = document.createElement("div");
        panel.className = "link-panel";

        const panelHeader = document.createElement("div");
        panelHeader.className = "link-header";
        panelHeader.innerHTML = `<span class="link-title">${t("sections", "link")} ${link.key}</span>`;

        const actions = document.createElement("div");
        actions.className = "link-actions";
        const removeButton = document.createElement("ha-icon-button");
        removeButton.setAttribute("label", t("actions", "remove_link"));
        removeButton.innerHTML = `<ha-icon icon="mdi:trash-can"></ha-icon>`;
        removeButton.addEventListener("click", () => {
            const config = JSON.parse(JSON.stringify(editor._config ?? {}));
            deletePath(config, `devices.${boxKey}.link.${link.key}`);
            editor._commit(config, true);
        });
        actions.appendChild(removeButton);
        panelHeader.appendChild(actions);
        panel.appendChild(panelHeader);

        const descriptors = linkDescriptors(boxKey, link.key);
        panel.appendChild(
            createForm(editor, descriptors, editor._config, (next) => editor._commit(next))
        );

        wrapper.appendChild(panel);
    });

    return wrapper;
}

export { localize };
