/*
 * Test suite for the Victron Venus Dashboard card.
 *
 * Runs in a plain browser (see `harness.html`): it stubs the Home Assistant
 * frontend components, builds the card and the editor with real DOM nodes and
 * checks the configuration, the number formatting, the flow direction and the
 * customisation output. No Home Assistant instance is required.
 */

import {
    buildStyleVariables,
    formatEntityState,
    getStubConfig,
    normalizeConfig,
    resolveDecimals,
} from "../dist/lib-config.js";
import * as libVenus from "../dist/lib-venus.js";
import { defineStubs, mockHass, standardStates, state } from "./mock-hass.js";

// Registers the `venus-os-dashboard` and `venus-os-editor` custom elements.
await import("../dist/Victron-Venus-Dashboard.js");

const results = [];

function check(name, condition, detail) {
    results.push({ name, ok: Boolean(condition), detail: condition ? "" : detail ?? "" });
}

function equal(name, actual, expected) {
    check(name, actual === expected, `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

function includes(name, haystack, needle) {
    check(
        name,
        typeof haystack === "string" && haystack.includes(needle),
        `expected to find ${JSON.stringify(needle)} in ${JSON.stringify(haystack)}`
    );
}

const tick = (ms = 30) => new Promise((resolve) => setTimeout(resolve, ms));

/* ------------------------------------------------------------------ *
 * 1. Configuration normalization and migration
 * ------------------------------------------------------------------ */

function testConfig() {
    const legacy = normalizeConfig({
        theme: "dark",
        param: { boxCol1: 3, boxCol2: 2, boxCol3: 4 },
        styles: { header: 12, sensor: 20 },
        devices: {
            "1-1": {
                entity: "sensor.grid_power",
                decimals: 2,
                anchors: "R-1, B-2",
                link: { 1: { start: "R-1", end: "2-1_L-1", inv: true } },
            },
        },
    });

    equal("legacy: theme kept", legacy.theme, "dark");
    equal("legacy: columns from param", legacy.layout.columns.join(","), "3,2,4");
    equal("legacy: header font", legacy.typography.header, "12px");
    equal("legacy: sensor font", legacy.typography.sensor, "20px");
    equal("legacy: device decimals", legacy.devices["1-1"].decimals.main, 2);
    equal("legacy: anchors parsed", legacy.devices["1-1"].anchors.length, 2);
    equal("legacy: anchor side", legacy.devices["1-1"].anchors[0].side, "R");
    equal("legacy: anchor qty", legacy.devices["1-1"].anchors[1].qty, 2);
    equal("legacy: inv maps to reverse", legacy.devices["1-1"].links[0].direction, "reverse");

    const modern = normalizeConfig({
        layout: { columns: [4, 1, 1], aspect: 75 },
        background: { preset: "gradient", from: "#001122", to: "#334455", angle: 90 },
        numbers: { decimals: 1, main_only: true },
        links: { direction: "forward", curve: "straight", ball_size: 6 },
    });

    equal("v2: columns", modern.layout.columns.join(","), "4,1,1");
    equal("v2: aspect", modern.layout.aspect, 75);
    equal("v2: gradient angle", modern.background.angle, 90);
    equal("v2: decimals default", modern.numbers.decimals, 1);
    equal("v2: main only", modern.numbers.mainOnly, true);
    equal("v2: link direction", modern.links.direction, "forward");
    equal("v2: ball size", modern.links.ballSize, 6);

    const clamped = normalizeConfig({
        layout: { columns: [99, 0, -3], aspect: 500 },
        links: { speed: 9999, width: 0.0001, direction: "sideways" },
        numbers: { decimals: 42 },
    });
    equal("guard: column upper bound", clamped.layout.columns[0], 4);
    equal("guard: column lower bound", clamped.layout.columns[1], 1);
    equal("guard: aspect clamped", clamped.layout.aspect, 150);
    equal("guard: speed clamped", clamped.links.speed, 100);
    equal("guard: width clamped", clamped.links.width, 0.5);
    equal("guard: unknown direction falls back", clamped.links.direction, "auto");
    equal("guard: decimals clamped", clamped.numbers.decimals, 6);

    const empty = normalizeConfig(undefined);
    equal("guard: empty config renders theme preset", empty.background.preset, "theme");
    equal("guard: empty config has one box per column", empty.layout.columns.join(","), "1,1,1");

    check("stub config exposes devices", Object.keys(getStubConfig(mockHass(standardStates())).devices).length > 0);
}

/* ------------------------------------------------------------------ *
 * 2. Per entity decimals
 * ------------------------------------------------------------------ */

function testDecimals() {
    const numbers = normalizeConfig({}).numbers;
    const hass = mockHass(standardStates(), {
        entities: { "sensor.temperature": { display_precision: 3 } },
    });

    equal(
        "decimals: fixed",
        formatEntityState(hass, "sensor.grid_power", 2, numbers).value,
        "-1234.57"
    );
    equal(
        "decimals: raw when unset",
        formatEntityState(hass, "sensor.grid_power", null, numbers).value,
        "-1234.5678"
    );
    equal(
        "decimals: auto uses the suggested precision",
        formatEntityState(hass, "sensor.grid_power", "auto", numbers).value,
        "-1234.6"
    );
    equal(
        "decimals: auto prefers the user override",
        formatEntityState(hass, "sensor.temperature", "auto", numbers).value,
        "21.457"
    );
    equal(
        "decimals: non numeric states are untouched",
        formatEntityState(hass, "binary_sensor.inverter", 2, numbers).value,
        "on"
    );
    equal(
        "decimals: missing entity uses the configured text",
        formatEntityState(hass, "sensor.does_not_exist", 2, numbers).value,
        "N/C"
    );
    equal(
        "decimals: missing entity text is configurable",
        formatEntityState(
            hass,
            "sensor.does_not_exist",
            2,
            normalizeConfig({ numbers: { missing: "-" } }).numbers
        ).value,
        "-"
    );
    equal(
        "decimals: trim removes trailing zeros",
        formatEntityState(
            hass,
            "sensor.battery_current",
            3,
            normalizeConfig({ numbers: { trim: true } }).numbers
        ).value,
        "-12.5"
    );

    const config = normalizeConfig({
        numbers: { decimals: 1 },
        devices: {
            "1-1": {
                entity: "sensor.grid_power",
                entity2: "sensor.solar_power",
                headerEntity: "sensor.temperature",
                footerEntity1: "sensor.battery_current",
                decimals_header: 0,
                decimals_footer1: "auto",
            },
        },
    });
    const device = config.devices["1-1"];

    equal("decimals: card default reaches the main value", resolveDecimals(config, device, "main"), 1);
    equal("decimals: card default reaches the second value", resolveDecimals(config, device, "entity2"), 1);
    equal("decimals: entity own setting wins", resolveDecimals(config, device, "header"), 0);
    equal("decimals: auto accepted per entity", resolveDecimals(config, device, "footer1"), "auto");
    equal(
        "decimals: footer without setting inherits the card default",
        resolveDecimals(config, device, "footer2"),
        1
    );

    const mainOnly = normalizeConfig({
        numbers: { decimals: 1, main_only: true },
        devices: { "1-1": { entity: "sensor.grid_power", entity2: "sensor.solar_power" } },
    });
    equal(
        "decimals: filter keeps the main value formatted",
        resolveDecimals(mainOnly, mainOnly.devices["1-1"], "main"),
        1
    );
    equal(
        "decimals: filter leaves the second value alone",
        resolveDecimals(mainOnly, mainOnly.devices["1-1"], "entity2"),
        null
    );

    const deviceDefault = normalizeConfig({
        numbers: { decimals: 3, main_only: true },
        devices: { "1-1": { entity: "sensor.grid_power", entity2: "x", decimals: 2 } },
    });
    equal(
        "decimals: the device setting still applies to its own entities",
        resolveDecimals(deviceDefault, deviceDefault.devices["1-1"], "entity2"),
        2
    );
}

/* ------------------------------------------------------------------ *
 * 3. Style variables (background, colours, fonts)
 * ------------------------------------------------------------------ */

function testStyleVariables() {
    const dark = (config) => buildStyleVariables(normalizeConfig(config), true);
    const light = (config) => buildStyleVariables(normalizeConfig(config), false);

    const themePreset = dark({});
    includes("background: theme uses a theme variable", themePreset["--vv-dashboard-bg"], "var(--card-background-color");

    const solid = dark({ background: { preset: "solid", color: "#123456" } });
    equal("background: solid colour", solid["--vv-dashboard-bg"], "#123456");

    const solidLight = light({
        background: { preset: "solid", color: "#123456", color_light: "#abcdef" },
    });
    equal("background: light variant", solidLight["--vv-dashboard-bg"], "#abcdef");

    const gradient = dark({
        background: { preset: "gradient", from: "#000000", to: "#ffffff", angle: 45 },
    });
    includes("background: gradient start", gradient["--vv-dashboard-bg-image"], "#000000");
    includes("background: gradient end", gradient["--vv-dashboard-bg-image"], "#ffffff");
    includes("background: gradient angle", gradient["--vv-dashboard-bg-image"], "45deg");

    const none = dark({ background: { preset: "none" } });
    equal("background: transparent preset", none["--vv-dashboard-bg"], "transparent");

    const image = dark({ background: { preset: "image", image: "/local/bg.png" } });
    includes("background: image url", image["--vv-dashboard-bg-image"], "/local/bg.png");

    equal("background: opacity", dark({ background: { opacity: 50 } })["--vv-dashboard-opacity"], "0.5");
    equal("background: covers the whole card", dark({})["--vv-card-bg"], "transparent");
    equal(
        "background: can stay inside the card",
        dark({ background: { card: false } })["--vv-card-bg"],
        "var(--card-background-color, transparent)"
    );
    equal("layout: radius", dark({ layout: { radius: 18 } })["--vv-dashboard-radius"], "18px");
    equal("layout: aspect", dark({ layout: { aspect: 70 } })["--vv-dashboard-aspect"], "70%");
    equal("layout: padding", dark({ layout: { padding: "1px 2px" } })["--vv-dashboard-padding"], "1px 2px");

    equal("colors: victron palette box", dark({ colors: { mode: "venus" } })["--vv-box-bg"], "#1f2a3c");
    equal("colors: victron palette box (light)", light({ colors: { mode: "venus" } })["--vv-box-bg"], "#ffffff");
    includes(
        "colors: theme mode uses the card background",
        dark({ colors: { mode: "theme" } })["--vv-box-bg"],
        "var(--card-background-color"
    );
    equal(
        "colors: single override wins",
        dark({ colors: { box: "#ff00ff" } })["--vv-box-bg"],
        "#ff00ff"
    );
    equal(
        "colors: variable override accepted",
        dark({ colors: { line: "var(--accent-color)" } })["--vv-line"],
        "var(--accent-color)"
    );
    equal(
        "colors: nonsense override ignored",
        dark({ colors: { line: "   " } })["--vv-line"],
        "var(--primary-color, #4369a2)"
    );

    equal("fonts: explicit size", dark({ typography: { sensor: 16 } })["--vv-font-sensor"], "16px");
    equal("fonts: auto stays auto", dark({ typography: { sensor: "auto" } })["--vv-font-sensor"], "auto");
    equal("fonts: unit scale", dark({ typography: { unit_scale: 0.75 } })["--vv-unit-scale"], "0.75");

    equal("links: width", dark({ links: { width: 4 } })["--vv-line-width"], "4");
    equal("links: opacity", dark({ links: { opacity: 0.5 } })["--vv-line-opacity"], "0.5");
}

/* ------------------------------------------------------------------ *
 * 4. Card rendering
 * ------------------------------------------------------------------ */

function buildCard(config, hass) {
    const card = document.createElement("venus-os-dashboard");
    document.body.appendChild(card);
    card.setConfig(config);
    card.hass = hass;
    return card;
}

function shadow(card) {
    return card.shadowRoot;
}

function testCard() {
    const baseConfig = {
        layout: { columns: [2, 1, 2] },
        numbers: { decimals: 1 },
        devices: {
            "1-1": {
                name: "Grid",
                icon: "mdi:transmission-tower",
                entity: "sensor.grid_power",
                anchors: "R-1",
                link: { 1: { start: "R-1", end: "2-1_L-1" } },
            },
            "1-2": {
                name: "Battery",
                entity: "sensor.battery_soc",
                entity2: "sensor.battery_current",
                decimals_entity2: 2,
                headerEntity: "sensor.temperature",
                decimals_header: "auto",
                footerEntity1: "sensor.battery_current",
                gauge: true,
                anchors: "R-1",
                link: {
                    1: { start: "R-1", end: "2-1_B-1", direction: "reverse" },
                    2: { start: "R-1", end: "2-1_B-2", direction: "both" },
                },
            },
            "2-1": { name: "Multiplus", anchors: "L-1, B-2, R-1" },
            "3-1": {
                name: "Home",
                entity: "sensor.grid_power",
                anchors: "L-1",
                link: { 1: { start: "L-1", end: "2-1_R-1" } },
            },
            "3-2": { name: "Solar", entity: "sensor.solar_power", anchors: "L-1" },
        },
    };

    const hass = mockHass(standardStates(), { entities: { "sensor.temperature": { display_precision: 3 } } });
    const card = buildCard(baseConfig, hass);

    const boxes = shadow(card).querySelectorAll(".box");
    equal("card: box count", boxes.length, 5);
    equal("card: anchors", shadow(card).querySelectorAll(".anchor").length, 8);
    equal("card: paths", shadow(card).querySelectorAll("#path_container path").length, 4);
    equal("card: balls", shadow(card).querySelectorAll("#circ_container circle").length, 5);

    equal(
        "card: main value formatted",
        shadow(card).querySelector("#content_1-1 .boxSensor1").textContent.trim(),
        "-1234.6W"
    );
    equal(
        "card: unit is separated",
        shadow(card).querySelector("#content_1-1 .boxSensor1 .boxUnit").textContent,
        "W"
    );
    equal(
        "card: second value has its own decimals",
        shadow(card).querySelector("#content_1-2 .boxSensor2").textContent.trim(),
        "-12.50A"
    );
    equal(
        "card: header entity uses the auto precision",
        shadow(card).querySelector("#content_1-2 .headerEntity").textContent.trim(),
        "21.457°C"
    );
    equal(
        "card: footer entity formatted",
        shadow(card).querySelector("#content_1-2 .boxFooter .footerCell").textContent.trim(),
        "-12.5A"
    );
    equal(
        "card: solar value formatted",
        shadow(card).querySelector("#content_3-2 .boxSensor1").textContent.trim(),
        "2345.7W"
    );

    equal("card: icon property", shadow(card).querySelector("#content_1-1 ha-icon").icon, "mdi:transmission-tower");
    equal("card: title", shadow(card).querySelector("#content_1-1 .boxTitle").textContent, "Grid");
    check(
        "card: no graph without an entity graph flag",
        shadow(card).querySelector("#graph_1-1").hidden === true
    );
    check(
        "card: gauge height follows the value",
        shadow(card).querySelector("#gauge_1-2").style.height === "87.6543%",
        shadow(card).querySelector("#gauge_1-2").style.height
    );

    const variables = card.style.getPropertyValue("--vv-box-bg");
    check("card: style variables applied", variables.length > 0, variables);
    equal("card: dark theme marker", card.getAttribute("data-theme"), "dark");
    check("card: card size is a number", typeof card.getCardSize() === "number");
    equal("card: grid options columns", card.getGridOptions().columns, "full");
    equal("card: grid options rows", card.getGridOptions().rows, "auto");

    // Missing entity + unavailable state handling
    const sparse = buildCard(
        { devices: { "1-1": { name: "Empty", entity: "sensor.gone", anchors: "R-1" } } },
        hass
    );
    equal(
        "card: missing entity placeholder",
        shadow(sparse).querySelector("#content_1-1 .boxSensor1").textContent.trim(),
        "N/C"
    );

    // Theme handling
    const lightCard = buildCard({ theme: "light" }, mockHass(standardStates(), { darkMode: false }));
    equal("card: explicit light theme", lightCard.getAttribute("data-theme"), "light");
    const autoCard = buildCard({ theme: "auto" }, mockHass(standardStates(), { darkMode: false }));
    equal("card: auto theme follows Home Assistant", autoCard.getAttribute("data-theme"), "light");

    // Demo mode renders nothing but the skeleton
    const demo = buildCard({ demo: true }, hass);
    equal("card: demo mode has no boxes", shadow(demo).querySelectorAll(".box").length, 0);

    // Broken configuration shows an alert instead of throwing
    const broken = document.createElement("venus-os-dashboard");
    document.body.appendChild(broken);
    broken.setConfig({ layout: { columns: [2, 1, 1] }, devices: { "1-1": { entity: 42 } } });
    broken.hass = hass;
    check("card: broken config does not throw", true);
}

/* ------------------------------------------------------------------ *
 * 5. Flow direction
 * ------------------------------------------------------------------ */

function testFlowDirection() {
    return testFlowDirectionAsync();
}

async function testFlowDirectionAsync() {
    const config = {
        layout: { columns: [4, 1, 1] },
        links: { animate: false },
        devices: {
            "1-1": {
                name: "Grid",
                entity: "sensor.grid_power",
                anchors: "R-1",
                link: {
                    1: { start: "R-1", end: "2-1_L-1", direction: "forward" },
                },
            },
            "1-2": {
                name: "Battery",
                entity: "sensor.battery_current",
                anchors: "R-1",
                link: { 1: { start: "R-1", end: "2-1_B-1", direction: "reverse", entity: "sensor.battery_current" } },
            },
            "1-3": {
                name: "Solar",
                entity: "sensor.solar_power",
                anchors: "R-1",
                link: { 1: { start: "R-1", end: "2-1_B-2", direction: "both" } },
            },
            "1-4": {
                name: "Off",
                anchors: "R-1",
                link: { 1: { start: "R-1", end: "2-1_R-1", direction: "off" } },
            },
            "2-1": { name: "Multiplus", anchors: "L-1, B-2, R-1" },
        },
    };

    const hass = mockHass(standardStates());
    const card = buildCard(config, hass);
    const root = shadow(card);

    equal("flow: one ball per directional link", root.querySelectorAll("#circ_container circle").length, 4);
    equal("flow: bidirectional link draws two balls", libVenus.directionControls.size, 4);

    const forward = libVenus.directionControls.get("1-1_R-1->2-1_L-1");
    const reverse = libVenus.directionControls.get("1-2_R-1->2-1_B-1");
    const both = libVenus.directionControls.get("1-3_R-1->2-1_B-2");
    const off = libVenus.directionControls.get("1-4_R-1->2-1_R-1");

    equal("flow: forward direction", forward.direction, "forward");
    equal("flow: reverse direction", reverse.direction, "reverse");
    equal("flow: both starts forward", both.direction, "forward");
    equal("flow: both has two balls", both.balls.length, 2);
    equal("flow: off has no balls", off.balls.length, 0);
    check("flow: off still draws the line", off.path.isConnected);

    const forwardX = parseFloat(forward.balls[0].getAttribute("cx"));
    const reverseX = parseFloat(reverse.balls[0].getAttribute("cx"));
    check("flow: parked balls sit on opposite ends", forwardX !== reverseX, `${forwardX} / ${reverseX}`);

    // Automatic direction follows the sign of the linked entity
    const autoConfig = {
        devices: {
            "1-1": {
                name: "Grid",
                entity: "sensor.grid_power",
                anchors: "R-1",
                link: { 1: { start: "R-1", end: "2-1_L-1", entity: "sensor.grid_power" } },
            },
            "2-1": { name: "Multiplus", anchors: "L-1" },
        },
    };
    const autoCard = buildCard(autoConfig, mockHass(standardStates()));
    const autoLink = libVenus.directionControls.get("1-1_R-1->2-1_L-1");
    equal("flow: negative value reverses the flow", autoLink.direction, "reverse");

    const positiveHass = mockHass({
        ...standardStates(),
        "sensor.grid_power": state("500", { unit_of_measurement: "W" }),
    });
    autoCard.hass = positiveHass;
    equal("flow: positive value flows forward", autoLink.direction, "forward");

    const zeroHass = mockHass({
        ...standardStates(),
        "sensor.grid_power": state("0", { unit_of_measurement: "W" }),
    });
    autoCard.hass = zeroHass;
    equal("flow: idle when the value is zero", autoLink.direction, "idle");

    const missingHass = mockHass({ ...standardStates(), "sensor.grid_power": state("unavailable") });
    autoCard.hass = missingHass;
    equal("flow: non numeric value keeps flowing", autoLink.direction, "forward");

    // Several links from the same anchor must not overwrite each other
    const twins = buildCard(
        {
            links: { animate: false },
            devices: {
                "1-1": {
                    name: "Grid",
                    anchors: "R-1",
                    link: {
                        1: { start: "R-1", end: "2-1_L-1", direction: "forward" },
                        2: { start: "R-1", end: "2-1_R-1", direction: "reverse" },
                    },
                },
                "2-1": { name: "Multiplus", anchors: "L-1, R-1" },
            },
        },
        mockHass(standardStates())
    );
    equal("flow: two links from one anchor", shadow(twins).querySelectorAll("#path_container path").length, 2);
    equal(
        "flow: two links keep their own direction",
        libVenus.directionControls.get("1-1_R-1->2-1_L-1").direction +
            "/" +
            libVenus.directionControls.get("1-1_R-1->2-1_R-1").direction,
        "forward/reverse"
    );

    // Redrawing must not leave animations behind
    libVenus.redrawLines(normalizeConfig(config), shadow(card).querySelector("#container"));
    equal("flow: redraw keeps the link count", libVenus.directionControls.size, 4);

    // Starting the history task must not stop the running dot animations
    const animated = buildCard(
        {
            layout: { columns: [1, 1, 1] },
            links: { animate: true },
            devices: {
                "1-1": {
                    name: "Grid",
                    entity: "sensor.grid_power",
                    anchors: "R-1",
                    link: { 1: { start: "R-1", end: "2-1_L-1", direction: "forward" } },
                },
                "2-1": { name: "Multiplus", anchors: "L-1" },
            },
        },
        mockHass(standardStates())
    );
    const animatedLink = libVenus.directionControls.get("1-1_R-1->2-1_L-1");
    check("flow: dots animate by default", animatedLink.animate === true);
    await libVenus.startPeriodicTask(normalizeConfig({}), mockHass(standardStates()));
    check(
        "flow: starting the history task keeps the animation",
        animatedLink.animate === true && libVenus.directionControls.size > 0,
        JSON.stringify({ animate: animatedLink.animate, links: libVenus.directionControls.size })
    );
    animated.remove();
}

/* ------------------------------------------------------------------ *
 * 6. Editor
 * ------------------------------------------------------------------ */

async function testEditor() {
    const { default: EditorElement } = await import("../dist/editor.js");
    void EditorElement;

    const config = {
        layout: { columns: [2, 1, 1] },
        devices: {
            "1-1": {
                name: "Grid",
                entity: "sensor.grid_power",
                decimals: 2,
                anchors: "R-1",
                link: { 1: { start: "R-1", end: "2-1_L-1", inv: true } },
            },
            "1-2": { name: "Battery", anchors: "R-1" },
            "2-1": { name: "Multiplus", anchors: "L-1" },
        },
    };

    const editor = document.createElement("venus-os-editor");
    document.body.appendChild(editor);
    editor.hass = mockHass(standardStates());
    editor.setConfig(config);
    await tick(80);

    check("editor: renders forms", editor.shadowRoot.querySelectorAll("ha-form").length >= 8);
    equal("editor: tabs", editor.shadowRoot.querySelectorAll("ha-tab-group-tab").length, 4);
    check("editor: no shoelace components", editor.shadowRoot.querySelectorAll("sl-tab-group").length === 0);
    check("editor: value is exposed", editor.value === config, "editor.value differs from the config");

    const forms = [...editor.shadowRoot.querySelectorAll("ha-form")];

    // Every label must be translated in every bundled language
    const languages = ["en", "de", "es", "fr", "it"];
    for (const language of languages) {
        editor.hass = { ...mockHass(standardStates()), language };
        await tick(120);

        const untranslated = [];
        [...editor.shadowRoot.querySelectorAll("ha-form")].forEach((form) => {
            (form.schema || []).forEach((item) => {
                const label = form.computeLabel?.(item) ?? "";
                if (label.startsWith("⚠️")) untranslated.push(`${language}:${item.name}`);
            });
        });
        equal(`editor: all labels translated (${language})`, untranslated.length, 0);
        if (untranslated.length > 0) {
            results.push({ name: `editor: untranslated (${language})`, ok: false, detail: untranslated.join(", ") });
        }
    }

    editor.hass = mockHass(standardStates());
    await tick(120);

    // Card level: background preset and colours
    const backgroundForm = [...editor.shadowRoot.querySelectorAll("ha-form")].find((form) =>
        (form.schema || []).some((item) => item.name === "background_preset")
    );
    check("editor: background form exists", Boolean(backgroundForm));
    backgroundForm.setValue("background_preset", "gradient");
    await tick(20);
    equal("editor: background preset written", editor.value.background.preset, "gradient");

    backgroundForm.setValue("background_color", "#102030");
    await tick(20);
    equal("editor: background colour written", editor.value.background.color, "#102030");

    backgroundForm.setValue("background_opacity", 40);
    await tick(20);
    equal("editor: background opacity written", editor.value.background.opacity, 40);

    const colorsForm = [...editor.shadowRoot.querySelectorAll("ha-form")].find((form) =>
        (form.schema || []).some((item) => item.name === "color_box")
    );
    colorsForm.setValues({ colors_mode: "custom", color_box: "#aabbcc" });
    await tick(20);
    equal("editor: colour mode written", editor.value.colors.mode, "custom");
    equal("editor: colour slot written", editor.value.colors.box, "#aabbcc");

    const numbersForm = [...editor.shadowRoot.querySelectorAll("ha-form")].find((form) =>
        (form.schema || []).some((item) => item.name === "numbers_decimals")
    );
    numbersForm.setValues({ numbers_decimals: 2, numbers_auto: true, numbers_main_only: true });
    await tick(20);
    equal("editor: default decimals written", editor.value.numbers.decimals, 2);
    equal("editor: auto precision written", editor.value.numbers.auto, true);
    equal("editor: main only written", editor.value.numbers.main_only, true);

    const linksForm = [...editor.shadowRoot.querySelectorAll("ha-form")].find((form) =>
        (form.schema || []).some((item) => item.name === "links_direction")
    );
    linksForm.setValues({ links_direction: "both", links_width: 3, links_animate: false });
    await tick(20);
    equal("editor: flow direction written", editor.value.links.direction, "both");
    equal("editor: line width written", editor.value.links.width, 3);
    equal("editor: animation disabled written", editor.value.links.animate, false);

    const typographyForm = [...editor.shadowRoot.querySelectorAll("ha-form")].find((form) =>
        (form.schema || []).some((item) => item.name === "font_sensor")
    );
    typographyForm.setValue("font_sensor", "18px");
    await tick(20);
    equal("editor: font size written", editor.value.typography.sensor, "18px");

    // Column tabs: per entity decimals and the legacy key cleanup
    editor._tab = "1";
    editor._render();
    await tick(60);

    const deviceForm = [...editor.shadowRoot.querySelectorAll("ha-form")].find((form) =>
        (form.schema || []).some((item) => item.name === "decimals_footer2")
    );
    check("editor: device form exposes per entity decimals", Boolean(deviceForm));
    const slotNames = [
        ...new Set(
            [...editor.shadowRoot.querySelectorAll("ha-form")]
                .flatMap((form) => (form.schema || []).map((item) => item.name))
                .filter((name) => name.startsWith("decimals_"))
        ),
    ];
    equal(
        "editor: six decimal slots",
        slotNames.sort().join(","),
        "decimals_entity2,decimals_footer1,decimals_footer2,decimals_footer3,decimals_header,decimals_main"
    );
    equal(
        "editor: legacy decimals is read for the main value",
        [...editor.shadowRoot.querySelectorAll("ha-form")]
            .find((form) => (form.schema || []).some((item) => item.name === "decimals_main"))
            .data.decimals_main,
        "2"
    );

    const mainDecimalsForm = [...editor.shadowRoot.querySelectorAll("ha-form")].find((form) =>
        (form.schema || []).some((item) => item.name === "decimals_main")
    );
    mainDecimalsForm.setValue("decimals_main", "3");
    await tick(20);
    // The main value deliberately keeps the version 1 key name.
    equal("editor: device decimals written", editor.value.devices["1-1"].decimals, 3);
    equal(
        "editor: no alias key written",
        editor.value.devices["1-1"].decimals_main,
        undefined
    );

    deviceForm.setValue("decimals_footer2", "auto");
    await tick(20);
    equal("editor: entity decimals accepts auto", editor.value.devices["1-1"].decimals_footer2, "auto");

    mainDecimalsForm.setValue("decimals_main", "inherit");
    await tick(20);
    check(
        "editor: inherit removes the key",
        editor.value.devices["1-1"].decimals === undefined,
        JSON.stringify(editor.value.devices["1-1"])
    );

    // Anchors are stored as a compact string
    const anchorForm = [...editor.shadowRoot.querySelectorAll("ha-form")].find((form) =>
        (form.schema || []).some((item) => item.name === "anchor_bottom")
    );
    anchorForm.setValues({ anchor_bottom: 2 });
    await tick(20);
    equal("editor: anchors written", editor.value.devices["1-1"].anchors, "B-2, R-1");
    anchorForm.setValue("anchor_bottom", 0);
    await tick(20);
    equal("editor: anchors removed", editor.value.devices["1-1"].anchors, "R-1");

    // Links keep the legacy boolean working and write the new key
    const linkForm = [...editor.shadowRoot.querySelectorAll("ha-form")].find((form) =>
        (form.schema || []).some((item) => item.name === "link_1_direction")
    );
    check("editor: link form exists", Boolean(linkForm));
    equal("editor: legacy inv is shown as reverse", linkForm.data.link_1_direction, "reverse");
    linkForm.setValue("link_1_direction", "forward");
    await tick(20);
    equal("editor: link direction written", editor.value.devices["1-1"].link[1].direction, "forward");
    check(
        "editor: legacy inv key removed",
        editor.value.devices["1-1"].link[1].inv === undefined,
        JSON.stringify(editor.value.devices["1-1"].link)
    );

    // Anchor dropdowns are populated from the configuration
    const startOptions = (linkForm.schema.find((item) => item.name === "link_1_start") || {}).selector;
    const endOptions = (linkForm.schema.find((item) => item.name === "link_1_end") || {}).selector;
    equal("editor: start anchors listed", startOptions.select.options.length, 1);
    check("editor: end anchors exclude the own anchors", endOptions.select.options.length >= 1);

    // Adding a link uses the next free index
    const addButton = [...editor.shadowRoot.querySelectorAll("ha-button")].find((button) =>
        button.textContent.includes("Add link") || button.innerHTML.includes("Add link")
    );
    check("editor: add link button exists", Boolean(addButton));
    addButton.click();
    await tick(60);
    equal("editor: link added", Object.keys(editor.value.devices["1-1"].link).sort().join(","), "1,2");

    // Removing the second link leaves the first one untouched
    const panels = [...editor.shadowRoot.querySelectorAll(".link-panel")];
    equal("editor: one panel per link", panels.length, 2);
    const secondPanel = panels.find((panel) =>
        panel.querySelector(".link-title").textContent.trim().endsWith("2")
    );
    secondPanel.querySelector("ha-icon-button").click();
    await tick(60);
    equal("editor: link removed", Object.keys(editor.value.devices["1-1"].link).join(","), "1");
    equal(
        "editor: the first link kept its anchor",
        editor.value.devices["1-1"].link[1].start,
        "R-1"
    );

    // Configuration echoed back by Home Assistant must not rebuild the form
    const before = editor.shadowRoot.querySelector("ha-form");
    await editor.setConfig(JSON.parse(JSON.stringify(editor.value)));
    await tick(20);
    check("editor: identical config is not re-rendered", before === editor.shadowRoot.querySelector("ha-form"));
}

/* ------------------------------------------------------------------ *
 * Runner
 * ------------------------------------------------------------------ */

async function run() {
    defineStubs();

    testConfig();
    testDecimals();
    testStyleVariables();
    testCard();
    await testFlowDirection();
    await testEditor();

    const failed = results.filter((result) => !result.ok);
    const output = document.getElementById("results");
    output.textContent = results
        .map((result) => `${result.ok ? "PASS" : "FAIL"}  ${result.name}${result.ok ? "" : ` -- ${result.detail}`}`)
        .join("\n");
    output.dataset.summary = `${results.length - failed.length}/${results.length}`;
    document.title = failed.length === 0 ? `ALL PASS (${results.length})` : `FAILED ${failed.length}/${results.length}`;

    failed.forEach((result) => console.error(`FAIL ${result.name}: ${result.detail}`));
    console.log(`Venus dashboard tests: ${results.length - failed.length}/${results.length} passed`);
}

run().catch((error) => {
    const output = document.getElementById("results");
    output.textContent = `RUNNER ERROR: ${error.message}\n${error.stack}`;
    console.error(error);
});
