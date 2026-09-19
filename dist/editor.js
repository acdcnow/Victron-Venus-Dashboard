/*
 * Victron Venus Dashboard - visual editor element.
 *
 * Registered as `venus-os-editor` and returned by the card's `getConfigElement()`.
 * The heavy lifting (schemas, descriptors, rendering) lives in `lib-editor.js`.
 */

import { EDITOR_TYPE, normalizeConfig } from "./lib-config.js";
import { css } from "./css-editor.js";
import {
    loadTranslations,
    renderCardTab,
    renderColumnTab,
    t,
} from "./lib-editor.js";

/** Structural comparison, used to ignore the echo of our own changes. */
function isEqual(a, b) {
    if (a === b) return true;
    if (typeof a !== typeof b) return false;
    if (a === null || b === null || typeof a !== "object") return false;
    if (Array.isArray(a) !== Array.isArray(b)) return false;
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    return keysA.every((key) => isEqual(a[key], b[key]));
}

class VenusOsDashboardEditor extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this._config = {};
        this._hass = undefined;
        this._tab = "card";
        this._box = "";
        this._rendered = false;
        this._translationsLoaded = false;
        this._selfApplied = null;
        this.columns = [1, 1, 1];
    }

    async setConfig(config) {
        const next = config ?? {};

        // Home Assistant echoes our own edits back; rebuilding the form would
        // steal the focus from the field the user is typing in.
        if (isEqual(next, this._selfApplied)) {
            this._config = next;
            this._selfApplied = null;
            return;
        }

        this._config = next;
        this.columns = normalizeConfig(next).layout.columns;
        await loadTranslations(this._hass);
        this._translationsLoaded = true;
        this._render();
    }

    set hass(hass) {
        const languageChanged = hass?.language !== this._hass?.language;
        this._hass = hass;

        if (!this._rendered) {
            if (this._translationsLoaded) {
                this._render();
            } else {
                // `setConfig` runs before Home Assistant hands us `hass`, so the
                // translations are (re)loaded with the real language here.
                loadTranslations(hass, true).then(() => {
                    this._translationsLoaded = true;
                    this._render();
                });
            }
            return;
        }

        if (languageChanged) {
            loadTranslations(hass, true).then(() => this._render());
            return;
        }

        this.shadowRoot.querySelectorAll("ha-form").forEach((form) => {
            form.hass = hass;
        });
    }

    get hass() {
        return this._hass;
    }

    get value() {
        return this._config;
    }

    /** Applies a new configuration and tells Home Assistant about it. */
    _commit(config, rerender = false) {
        this._config = config;
        this._selfApplied = config;
        this.columns = normalizeConfig(config).layout.columns;

        this.dispatchEvent(
            new CustomEvent("config-changed", {
                detail: { config },
                bubbles: true,
                composed: true,
            })
        );

        if (rerender) this._render();
    }

    _render() {
        if (!this._hass) return;
        this._rendered = true;

        if (!this.shadowRoot.querySelector("#content")) {
            this.shadowRoot.innerHTML = `
                <style>${css()}</style>
                <ha-tab-group id="tabs">
                    <ha-tab-group-tab slot="nav" panel="card">${t("tabs", "card")}</ha-tab-group-tab>
                    ${[1, 2, 3]
                        .map(
                            (column) =>
                                `<ha-tab-group-tab slot="nav" panel="${column}">${t(
                                    "tabs",
                                    "column"
                                )} ${column}</ha-tab-group-tab>`
                        )
                        .join("")}
                </ha-tab-group>
                <div id="content" class="editor"></div>
            `;

            this.shadowRoot
                .querySelector("#tabs")
                .addEventListener("wa-tab-show", (event) => {
                    const tab = event.detail?.name ?? event.target?.panel;
                    if (!tab || tab === this._tab) return;
                    this._tab = tab;
                    this._render();
                });
        }

        this.shadowRoot.querySelectorAll("ha-tab-group-tab").forEach((tab) => {
            tab.active = tab.getAttribute("panel") === this._tab;
        });

        const content = this.shadowRoot.querySelector("#content");
        content.innerHTML = "";
        content.classList.toggle("editor", this._tab === "card");

        if (this._tab === "card") {
            renderCardTab(this, content);
        } else {
            renderColumnTab(this, content, parseInt(this._tab, 10));
        }
    }
}

customElements.define(EDITOR_TYPE, VenusOsDashboardEditor);

export default VenusOsDashboardEditor;
