/*
 * Victron Venus Dashboard for Home Assistant.
 *
 * A custom card that replicates the Victron Venus GUI v2 overview: boxes for
 * grid, battery, inverter and loads, connected by animated lines.
 *
 * Version 2 renders inside a shadow root, so its stylesheet no longer leaks into
 * every other card on the dashboard, and all colours, sizes and spacing come
 * from the Home Assistant theme plus the `--vv-*` custom properties generated
 * from the card configuration.
 */

import "./editor.js?v=2.0.0-beta.4";
import * as libVenus from "./lib-venus.js?v=2.0.0-beta.4";
import {
    CARD_TYPE,
    VERSION,
    buildStyleVariables,
    getStubConfig,
    resolveIsDark,
} from "./lib-config.js?v=2.0.0-beta.4";
import { cssData } from "./css-common.js?v=2.0.0-beta.4";

console.info(
    `%c 🗲 %c - %cVictron Venus Dashboard%c - %c 🗲 \n%c version ${VERSION}`,
    "color: white; font-weight: bold; background: black",
    "color: orange; font-weight: bold; background: blue; font-weight: bold;",
    "color: white; font-weight: bold; background: blue; text-decoration: underline; text-decoration-color: orange; text-decoration-thickness: 5px; text-underline-offset: 2px;",
    "color: orange; font-weight: bold; background: blue; font-weight: bold;",
    "color: white; font-weight: bold; background: black",
    "color: white; font-weight: bold; background: grey"
);

class VenusOsDashboardCard extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this._config = undefined;
        this._venus = undefined;
        this._hass = undefined;
        this._isDark = true;
        this._taskStarted = false;
        this._isDark = true;
        this._error = "";
    }

    static getStubConfig(hass) {
        return getStubConfig(hass);
    }

    static getConfigElement() {
        return document.createElement("venus-os-editor");
    }

    setConfig(config) {
        this._ensureSkeleton();

        if (!config) {
            this._showError("Venus dashboard: no configuration found.");
            return;
        }

        this._config = config;
        this._taskStarted = false;
        this._build();
    }

    /** Creates the shadow DOM skeleton once. */
    _ensureSkeleton() {
        if (this.shadowRoot.querySelector("#container")) return;
        this.shadowRoot.innerHTML = `
            <style id="card-style">${cssData()}</style>
            <style id="custom-style"></style>
            <ha-card id="container"></ha-card>
        `;
    }

    /** Fills the skeleton with the current configuration. */
    _build() {
        this._ensureSkeleton();
        this._themeSignature = "";

        const container = this.shadowRoot.querySelector("#container");
        container.innerHTML = "";

        // The files of this card are ES modules that keep their name across
        // versions, so a browser cache can serve an old module next to a new one.
        // Saying so is a lot more useful than "is not a function".
        if (typeof libVenus.renderDashboard !== "function") {
            this._venus = undefined;
            this._taskStarted = false;
            this._showError(
                "Venus dashboard: the card files are out of date. Reload the page with a cleared cache (Ctrl+Shift+R) or download the card again in HACS."
            );
            console.error(
                `Venus dashboard ${VERSION}: lib-venus.js does not export renderDashboard, the browser is serving a cached copy of the file.`,
                libVenus
            );
            this._applyTheme();
            this._applyCustomCss();
            return;
        }

        try {
            this._venus = libVenus.renderDashboard(this._config, container, this._hass);
            this._error = "";
        } catch (error) {
            this._venus = undefined;
            this._showError(`Venus dashboard: ${error.message}`);
            console.error("Venus dashboard: rendering failed.", error);
        }

        this._applyTheme();
        this._applyCustomCss();
        this._taskStarted = false;
    }

    set hass(hass) {
        this._hass = hass;
        if (!this._config) return;

        this._applyTheme();

        if (!this._venus || this._venus.demo) return;

        const container = this.shadowRoot.querySelector("#container");
        libVenus.fillBox(this._venus, hass, container);
        libVenus.updateFlowDirections(this._venus, hass);

        if (!this._taskStarted) {
            this._taskStarted = true;
            libVenus
                .startPeriodicTask(this._venus, hass)
                .then(() => libVenus.fillBox(this._venus, hass, container))
                .catch((error) =>
                    console.warn("Venus dashboard: history retrieval failed.", error)
                );
        }
    }

    get hass() {
        return this._hass;
    }

    /** Applies the resolved theme colours as `--vv-*` custom properties. */
    _applyTheme() {
        const config = this._venus;
        if (!config) return;

        this._isDark = resolveIsDark(config.theme, this._hass?.themes?.darkMode);
        const signature = `${config.theme}|${this._isDark}`;
        if (signature === this._themeSignature) return;
        this._themeSignature = signature;

        const variables = buildStyleVariables(config, this._isDark);
        Object.entries(variables).forEach(([name, value]) => {
            this.style.setProperty(name, `${value}`);
        });
        this.setAttribute("data-theme", this._isDark ? "dark" : "light");
    }

    /** Applies the optional raw CSS escape hatches from the configuration. */
    _applyCustomCss() {
        const style = this.shadowRoot.querySelector("#custom-style");
        if (!style || !this._venus) return;

        const blocks = [];
        if (this._venus.customCss) blocks.push(`:host { ${this._venus.customCss} }`);
        if (this._venus.background.css) {
            blocks.push(`.dashboard::before { ${this._venus.background.css} }`);
        }
        style.textContent = blocks.join("\n");
    }

    _showError(message) {
        this._error = message;
        const container = this.shadowRoot.querySelector("#container");
        if (!container) return;
        container.innerHTML = "";
        const alert = document.createElement("ha-alert");
        alert.setAttribute("alert-type", "error");
        alert.setAttribute("title", "Victron Venus Dashboard");
        alert.textContent = message;
        container.appendChild(alert);
    }

    getCardSize() {
        const aspect = this._venus?.layout?.aspect ?? 60;
        return Math.max(2, Math.round((aspect / 60) * 4));
    }

    getGridOptions() {
        return {
            columns: "full",
            min_columns: 6,
            rows: "auto",
        };
    }

    disconnectedCallback() {
        libVenus.destroy();
    }
}

// The card must survive being evaluated twice: with a manual installation next to
// a HACS installation, or when an old cached copy of a module is still around.
if (!customElements.get(CARD_TYPE)) {
    customElements.define(CARD_TYPE, VenusOsDashboardCard);
}

window.customCards = window.customCards || [];
if (!window.customCards.some((card) => card.type === CARD_TYPE)) {
    window.customCards.push({
        type: CARD_TYPE,
        name: "Victron Venus Dashboard",
        preview: true,
        description: "A dashboard that looks like the Victron Venus GUI v2.",
        documentationURL: "https://github.com/acdcnow/Victron-Venus-Dashboard",
    });
}

export default VenusOsDashboardCard;
