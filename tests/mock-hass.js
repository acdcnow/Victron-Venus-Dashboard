/*
 * Minimal stand-ins for the Home Assistant frontend components the card and the
 * editor use. Enough behaviour to render the card and drive the editor in a
 * plain browser, without a Home Assistant instance.
 */

class Stub extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
    }

    connectedCallback() {
        // Real Home Assistant components are block elements; unknown elements
        // are inline by default, which would collapse the card layout. This has
        // to happen outside the constructor: adding attributes there makes
        // `document.createElement` throw. The slot is what makes the light DOM
        // children of the stub visible at all.
        if (!this.shadowRoot.querySelector("style[data-stub]")) {
            const style = document.createElement("style");
            style.setAttribute("data-stub", "");
            style.textContent = ":host { display: block; }";
            this.shadowRoot.prepend(style);
            this.shadowRoot.appendChild(document.createElement("slot"));
        }
    }
}

/** `<ha-form>` stub that records the schema and can simulate user input. */
class StubForm extends Stub {
    set hass(value) {
        this._hass = value;
    }

    get hass() {
        return this._hass;
    }

    connectedCallback() {
        super.connectedCallback();
        this.render();
    }

    render() {
        let container = this.shadowRoot.querySelector(".form");
        if (!container) {
            container = document.createElement("div");
            container.className = "form";
            this.shadowRoot.appendChild(container);
        }
        container.innerHTML = (this.schema || [])
            .map((item) => {
                const label = this.computeLabel ? this.computeLabel(item) : item.name;
                return `<div class="form-row" data-name="${item.name}">${label}</div>`;
            })
            .join("");
    }

    /** Simulates the user changing one field of the form. */
    setValue(name, value) {
        this.data = { ...this.data, [name]: value };
        this.dispatchEvent(
            new CustomEvent("value-changed", {
                detail: { value: this.data },
                bubbles: true,
                composed: true,
            })
        );
    }

    /** Simulates the user editing several fields at once. */
    setValues(values) {
        this.data = { ...this.data, ...values };
        this.dispatchEvent(
            new CustomEvent("value-changed", {
                detail: { value: this.data },
                bubbles: true,
                composed: true,
            })
        );
    }
}

const SIMPLE_ELEMENTS = [
    "ha-card",
    "ha-icon",
    "ha-alert",
    "ha-button",
    "ha-icon-button",
    "ha-expansion-panel",
    "ha-tab-group",
    "ha-tab-group-tab",
    "ha-entity-picker",
    "ha-icon-picker",
    "ha-textfield",
    "ha-switch",
    "ha-combo-box",
];

export function defineStubs() {
    SIMPLE_ELEMENTS.forEach((name) => {
        if (!customElements.get(name)) customElements.define(name, class extends Stub {});
    });

    if (!customElements.get("ha-form")) {
        customElements.define("ha-form", StubForm);
    }
}

/** Minimal Home Assistant object, only the parts the card really reads. */
export function mockHass(states, options = {}) {
    return {
        states,
        entities: options.entities || {},
        themes: { darkMode: options.darkMode !== false },
        language: options.language || "en",
        callApi: options.callApi || (async () => []),
    };
}

/** Builds a state object with sensible defaults. */
export function state(value, attributes = {}) {
    return {
        entity_id: attributes.entity_id,
        state: `${value}`,
        attributes,
        last_changed: new Date().toISOString(),
        last_updated: new Date().toISOString(),
    };
}

/** Standard entity set used by the card tests. */
export function standardStates() {
    return {
        "sensor.grid_power": state("-1234.5678", {
            unit_of_measurement: "W",
            device_class: "power",
            friendly_name: "Grid power",
            suggested_display_precision: 1,
        }),
        "sensor.battery_soc": state("87.6543", {
            unit_of_measurement: "%",
            friendly_name: "Battery state of charge",
        }),
        "sensor.battery_current": state("-12.5", {
            unit_of_measurement: "A",
            friendly_name: "Battery current",
        }),
        "sensor.solar_power": state("2345.6789", {
            unit_of_measurement: "W",
            device_class: "power",
            friendly_name: "Solar power",
        }),
        "binary_sensor.inverter": state("on", { friendly_name: "Inverter" }),
        "sensor.temperature": state("21.4567", {
            unit_of_measurement: "°C",
            friendly_name: "Temperature",
            suggested_display_precision: 2,
        }),
    };
}
