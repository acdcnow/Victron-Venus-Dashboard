/*
 * Victron Venus Dashboard - visual editor stylesheet.
 *
 * Kept to Home Assistant theme variables and design tokens so the editor looks
 * like every other editor in the frontend.
 */

export function css() {
    return `
        :host {
            display: block;
            color: var(--primary-text-color);
        }

        .editor {
            display: flex;
            flex-direction: column;
            gap: var(--ha-space-3, 12px);
            padding-block: var(--ha-space-3, 12px);
        }

        ha-tab-group {
            display: block;
            margin-block-end: var(--ha-space-3, 12px);
        }

        ha-tab-group-tab {
            flex: 1;
        }

        ha-tab-group-tab::part(base) {
            width: 100%;
            justify-content: center;
        }

        ha-expansion-panel {
            display: block;
            margin-block-end: var(--ha-space-2, 8px);
            --expansion-panel-content-padding: 0;
        }

        .panel-content {
            display: flex;
            flex-direction: column;
            gap: var(--ha-space-3, 12px);
            padding: var(--ha-space-3, 12px) var(--ha-space-2, 8px);
        }

        ha-form {
            display: block;
        }

        .row-header {
            display: flex;
            align-items: center;
            gap: var(--ha-space-2, 8px);
        }

        .row-header ha-icon {
            --mdc-icon-size: 20px;
            --ha-icon-size: 20px;
            color: var(--secondary-text-color);
        }

        .link-panel {
            display: block;
            margin-block-end: var(--ha-space-2, 8px);
            border: 1px solid var(--divider-color);
            border-radius: var(--ha-card-border-radius, 12px);
            padding: var(--ha-space-2, 8px);
        }

        .link-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: var(--ha-space-2, 8px);
        }

        .link-title {
            font-weight: 500;
        }

        .link-actions {
            display: flex;
            align-items: center;
            gap: var(--ha-space-1, 4px);
        }

        .empty-hint {
            color: var(--secondary-text-color);
            font-size: var(--ha-font-size-s, 0.875rem);
            padding: var(--ha-space-2, 8px) 0;
        }

        ha-button {
            margin-block-start: var(--ha-space-2, 8px);
        }

        @media (max-width: 600px) {
            .panel-content {
                padding-inline: 0;
            }
        }
    `;
}

export default css;
