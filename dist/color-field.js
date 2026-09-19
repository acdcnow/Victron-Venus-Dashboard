/*
 * Victron Venus Dashboard - colour field.
 *
 * Home Assistant has no graphical colour picker inside `ha-form`, so the colour
 * options get their own field: the swatch is a picker that writes a plain
 * `#rrggbb` value and the text box next to it accepts any CSS colour, including
 * a theme variable such as `var(--accent-color)`. Both edit the same option, so
 * nothing that worked before stops working.
 *
 * The element behaves like a single `ha-form` row: it takes a `value`, exposes
 * `label` and `helper` and emits `value-changed` with `detail.value`.
 */

export const COLOR_FIELD_TYPE = "vv-color-field";

/** What the picker shows while the value is not a plain colour. */
const FALLBACK = "#38619b";

const STYLE = `
    :host {
        display: block;
    }

    .label {
        display: block;
        margin-block-end: var(--ha-space-1, 4px);
        color: var(--primary-text-color);
        font-size: var(--ha-font-size-s, 0.875rem);
    }

    .control {
        display: flex;
        align-items: center;
        gap: var(--ha-space-2, 8px);
    }

    .swatch {
        flex: none;
        inline-size: 40px;
        block-size: 40px;
        padding: 0;
        border: 1px solid var(--divider-color);
        border-radius: var(--ha-border-radius-sm, 8px);
        background: none;
        cursor: pointer;
    }

    .swatch::-webkit-color-swatch-wrapper {
        padding: 0;
    }

    .swatch::-webkit-color-swatch,
    .swatch::-moz-color-swatch {
        border: none;
        border-radius: calc(var(--ha-border-radius-sm, 8px) - 1px);
    }

    /* The value is a CSS colour the picker cannot show, for example a variable. */
    .swatch--custom {
        border-style: dashed;
        border-color: var(--primary-color);
    }

    .value {
        flex: 1;
        min-inline-size: 0;
        padding: var(--ha-space-2, 8px);
        border: 1px solid var(--divider-color);
        border-radius: var(--ha-border-radius-sm, 8px);
        background: var(--card-background-color, transparent);
        color: var(--primary-text-color);
        font: inherit;
    }

    .clear {
        flex: none;
        padding: var(--ha-space-1, 4px) var(--ha-space-2, 8px);
        border: none;
        border-radius: var(--ha-border-radius-sm, 8px);
        background: none;
        color: var(--secondary-text-color);
        cursor: pointer;
        font-size: var(--ha-font-size-l, 1.25rem);
        line-height: 1;
    }

    .clear:hover {
        color: var(--primary-text-color);
    }

    .swatch:focus-visible,
    .value:focus-visible,
    .clear:focus-visible {
        outline: 2px solid var(--primary-color);
        outline-offset: 2px;
    }

    .helper {
        margin: var(--ha-space-1, 4px) 0 0;
        color: var(--secondary-text-color);
        font-size: var(--ha-font-size-xs, 0.75rem);
    }
`;

/** What an unresolved value falls back to, so it is not mistaken for a colour. */
function inheritedColor() {
    const probe = document.createElement("span");
    probe.style.display = "none";
    probe.style.color = "inherit";
    document.body.appendChild(probe);
    const resolved = getComputedStyle(probe).color;
    probe.remove();
    return resolved;
}

/**
 * Resolves any CSS colour the browser understands to `#rrggbb`, and returns an
 * empty string when it cannot. The value is resolved in the document context,
 * so theme variables of the surrounding dashboard work as well.
 */
export function toHexColor(value) {
    const text = value === null || value === undefined ? "" : `${value}`.trim();
    if (text === "" || !document.body) return "";

    if (/^#[0-9a-f]{6}$/i.test(text)) return text.toLowerCase();
    if (/^#[0-9a-f]{3}$/i.test(text)) {
        return `#${text
            .slice(1)
            .split("")
            .map((character) => character + character)
            .join("")}`.toLowerCase();
    }

    const probe = document.createElement("span");
    probe.style.display = "none";
    probe.style.color = text;
    document.body.appendChild(probe);
    const declared = probe.style.color;
    const resolved = getComputedStyle(probe).color;
    probe.remove();

    // The browser does not know the value at all.
    if (declared === "") return "";

    // An undefined variable quietly falls back to the inherited colour, which
    // would seed the picker with a colour the user never asked for.
    if (text.includes("var(") && resolved === inheritedColor()) return "";

    const match = /^rgba?\(([^)]+)\)$/.exec((resolved ?? "").trim());
    if (!match) return "";

    const channels = match[1]
        .split(",")
        .slice(0, 3)
        .map((part) => Math.max(0, Math.min(255, Math.round(parseFloat(part)))));
    if (channels.some((channel) => Number.isNaN(channel))) return "";

    return `#${channels
        .map((channel) => channel.toString(16).padStart(2, "0"))
        .join("")}`;
}

class ColorField extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this._value = "";
        this._label = "";
        this._helper = "";
        this._clearLabel = "×";
        this._built = false;
        this._inputId = `vv-color-${Math.random().toString(36).slice(2, 8)}`;
    }

    connectedCallback() {
        if (!this._built) {
            this._built = true;
            this.shadowRoot.innerHTML = `
                <style>${STYLE}</style>
                <label class="label" for="${this._inputId}"></label>
                <div class="control">
                    <input type="color" class="swatch" value="${FALLBACK}">
                    <input type="text" class="value" id="${this._inputId}"
                        spellcheck="false" autocomplete="off">
                    <button type="button" class="clear"></button>
                </div>
                <p class="helper"></p>
            `;

            this._labelElement = this.shadowRoot.querySelector(".label");
            this._input = this.shadowRoot.querySelector(".value");
            this._swatch = this.shadowRoot.querySelector(".swatch");
            this._clear = this.shadowRoot.querySelector(".clear");
            this._helperElement = this.shadowRoot.querySelector(".helper");

            this._swatch.addEventListener("input", (event) =>
                this.setValue(event.target.value)
            );
            this._input.addEventListener("change", (event) =>
                this.setValue(event.target.value)
            );
            this._clear.addEventListener("click", () => this.setValue(""));
        }

        this._sync();
    }

    /** Label shown above the field. */
    set label(value) {
        this._label = value ?? "";
        this._sync();
    }

    get label() {
        return this._label;
    }

    /** Optional hint below the field. */
    set helper(value) {
        this._helper = value ?? "";
        this._sync();
    }

    get helper() {
        return this._helper;
    }

    /** Accessible name of the button that removes the value. */
    set clearLabel(value) {
        this._clearLabel = value ?? "×";
        this._sync();
    }

    get clearLabel() {
        return this._clearLabel;
    }

    set value(value) {
        this._value = value === null || value === undefined ? "" : `${value}`;
        this._sync();
    }

    get value() {
        return this._value;
    }

    /** Sets the value as if the user changed it, and notifies the editor. */
    setValue(value) {
        this.value = value;
        this.dispatchEvent(
            new CustomEvent("value-changed", {
                detail: { value: this._value },
                bubbles: true,
                composed: true,
            })
        );
    }

    _sync() {
        if (!this._built) return;

        this._labelElement.textContent = this._label;
        this._input.value = this._value;
        this._input.setAttribute("aria-label", this._label);
        this._swatch.setAttribute("aria-label", this._label);
        this._clear.setAttribute("aria-label", this._clearLabel);
        this._clear.title = this._clearLabel;
        this._clear.hidden = this._value === "";
        this._helperElement.textContent = this._helper;
        this._helperElement.hidden = this._helper === "";

        const hex = toHexColor(this._value);
        this._swatch.value = hex === "" ? FALLBACK : hex;
        this._swatch.classList.toggle("swatch--custom", hex === "");
        this._swatch.title = hex === "" ? this._value : hex;
    }
}

if (!customElements.get(COLOR_FIELD_TYPE)) {
    customElements.define(COLOR_FIELD_TYPE, ColorField);
}

export default ColorField;
