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

import "./editor.js";
import * as libVenus from "./lib-venus.js";
import {
    CARD_TYPE,
    VERSION,
    buildStyleVariables,
    getStubConfig,
    resolveIsDark,
} from "./lib-config.js";
import { cssData } from "./css-common.js";

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

customElements.define(CARD_TYPE, VenusOsDashboardCard);

window.customCards = window.customCards || [];
window.customCards.push({
    type: CARD_TYPE,
    name: "Victron Venus Dashboard",
    preview: true,
    description: "A dashboard that looks like the Victron Venus GUI v2.",
    documentationURL: "https://github.com/acdcnow/Victron-Venus-Dashboard",
});

export default VenusOsDashboardCard;
