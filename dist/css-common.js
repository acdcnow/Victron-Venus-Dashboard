/*
 * Victron Venus Dashboard - card stylesheet.
 *
 * The stylesheet is theme agnostic: every colour, size and spacing value comes
 * from a `--vv-*` custom property that `lib-config.js` generates from the card
 * configuration. Values fall back to Home Assistant theme variables and design
 * tokens, so the card follows the active theme and still renders on older
 * Home Assistant versions that do not define the newer tokens.
 */

const tokens = `
    /* Custom elements are inline by default, which would collapse the card. */
    :host {
        display: block;
    }

    /* Card shell ------------------------------------------------------ */
    ha-card {
        background: var(--vv-card-bg, transparent);
        border-radius: var(--ha-card-border-radius, var(--vv-dashboard-radius, 12px));
        overflow: hidden;
    }

    .db-container {
        position: relative;
        width: 100%;
        padding-bottom: var(--vv-dashboard-aspect, 60%);
        overflow: hidden;
        font-family: var(--vv-font-family, inherit);
        color: var(--vv-text, var(--primary-text-color, #ffffff));
    }

    .dashboard {
        position: absolute;
        inset: 0;
        display: flex;
        width: 100%;
        height: 100%;
        padding: var(--vv-dashboard-padding, 25px 20px 15px 20px);
        border-radius: inherit;
        box-sizing: border-box;
        gap: var(--vv-column-gap, 8%);
    }

    /* The background lives on its own layer so that "opacity" fades the
       background only, never the values inside the boxes. */
    .dashboard::before {
        content: "";
        position: absolute;
        inset: 0;
        border-radius: inherit;
        background-color: var(--vv-dashboard-bg, var(--card-background-color, #111111));
        background-image: var(--vv-dashboard-bg-image, none);
        background-size: cover;
        background-position: center;
        background-repeat: no-repeat;
        background-blend-mode: var(--vv-dashboard-bg-blend, normal);
        opacity: var(--vv-dashboard-opacity, 1);
        pointer-events: none;
        z-index: 0;
    }

    /* Columns --------------------------------------------------------- */
    .column {
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        position: relative;
        z-index: 1;
        width: 33.33%;
    }

    .column-1,
    .column-3 {
        width: 25%;
    }

    .column-2 {
        width: 34%;
    }

    /* Boxes ----------------------------------------------------------- */
    .box {
        position: relative;
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100%;
        max-height: var(--vv-box-max-height, 45%);
        margin: var(--ha-space-1, 4px);
        padding: 3% 5%;
        background-color: var(--vv-box-bg, var(--card-background-color, #1f2a3c));
        border: 1px solid var(--vv-boxBorder, transparent);
        border-radius: var(--ha-space-1, 4px);
        box-shadow: 0 0 1px 2px var(--vv-shadow, var(--divider-color, #38619b));
        color: var(--vv-text, var(--primary-text-color, #ffffff));
        box-sizing: border-box;
        overflow: hidden;
    }

    .box.is-unavailable {
        opacity: 0.6;
    }

    /* Anchors --------------------------------------------------------- */
    .anchor {
        position: absolute;
        background-color: var(--vv-anchor, var(--primary-color, #38619b));
        box-shadow: 0 0 1px 1px var(--vv-anchor, var(--primary-color, #38619b));
        border-radius: 50%;
    }

    .box .anchor-L {
        width: 5px;
        height: 10px;
        left: -6px;
        top: 50%;
        transform: translateY(-50%);
        border-radius: 5px 0 0 5px;
    }

    .box .anchor-R {
        width: 5px;
        height: 10px;
        right: -6px;
        top: 50%;
        transform: translateY(-50%);
        border-radius: 0 5px 5px 0;
    }

    .box .anchor-T {
        width: 10px;
        height: 5px;
        top: -6px;
        left: 50%;
        transform: translateX(-50%);
        border-radius: 5px 5px 0 0;
    }

    .box .anchor-B {
        width: 10px;
        height: 5px;
        bottom: -6px;
        left: 50%;
        transform: translateX(-50%);
        border-radius: 0 0 5px 5px;
    }

    /* Connection lines ------------------------------------------------ */
    .line {
        position: absolute;
        inset: 0;
        z-index: 0;
        pointer-events: none;
    }

    .line g path {
        stroke: var(--vv-line, var(--primary-color, #4369a2));
        stroke-width: var(--vv-line-width, 2);
        opacity: var(--vv-line-opacity, 1);
        fill: none;
    }

    .line g circle {
        fill: var(--vv-ball, var(--primary-text-color, #ffffff));
    }

    /* Box content ----------------------------------------------------- */
    .content {
        position: relative;
        display: flex;
        flex-direction: column;
        width: 100%;
        height: 100%;
        gap: var(--ha-space-1, 4px);
        cursor: pointer;
        outline: none;
        border-radius: inherit;
    }

    .content:focus-visible {
        outline: 2px solid var(--vv-anchor, var(--primary-color, #38619b));
        outline-offset: 2px;
    }

    .boxHeader {
        display: flex;
        align-items: center;
        width: 100%;
        height: 15%;
        gap: 3%;
        z-index: 2;
        font-size: var(--vv-font-header, 1em);
        font-weight: var(--vv-header-weight, 400);
    }

    .boxIcon {
        --mdc-icon-size: 1.2em;
        --ha-icon-size: 1.2em;
        flex: none;
        line-height: 1.2em;
    }

    .boxTitle {
        display: flex;
        align-items: center;
        width: 100%;
        text-align: start;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        z-index: 2;
    }

    .headerEntity {
        display: flex;
        align-items: center;
        gap: 3%;
        font-size: 1.1em;
        line-height: 1.1em;
        white-space: nowrap;
        z-index: 2;
    }

    .boxSensor1 {
        display: flex;
        align-items: center;
        width: 100%;
        gap: 3%;
        font-size: var(--vv-font-sensor, 1em);
        font-weight: var(--vv-sensor-weight, 400);
        line-height: 1em;
        z-index: 2;
    }

    .boxSensor2 {
        display: flex;
        align-items: center;
        width: 100%;
        gap: 3%;
        font-size: var(--vv-font-sensor2, 0.8em);
        line-height: 1.1em;
        z-index: 2;
    }

    .boxUnit {
        color: var(--vv-unit, var(--secondary-text-color, #aaaaaa));
        font-size: calc(1em * var(--vv-unit-scale, 1));
        z-index: 2;
    }

    /* Graph and gauge ------------------------------------------------- */
    .graph {
        position: absolute;
        bottom: 15%;
        width: 100%;
        height: 30%;
        z-index: 2;
        pointer-events: none;
    }

    .graph path {
        stroke: var(--vv-graph, var(--secondary-text-color, #ffffff));
    }

    .gauge {
        position: absolute;
        left: 0;
        bottom: 0;
        width: 100%;
        border-radius: 0 0 5px 5px;
        background: var(--vv-gauge, #547dbb);
        background: linear-gradient(
            to bottom,
            color-mix(in srgb, var(--vv-gauge, #70a1d5) 80%, white),
            var(--vv-gauge, #547dbb)
        );
        opacity: 0.8;
        z-index: 1;
        transition: height var(--ha-animation-duration-normal, 250ms) ease-out;
    }

    .gauge::before {
        content: "";
        position: absolute;
        inset: 0;
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 154' preserveAspectRatio='xMidYMid meet'%3E%3Cg transform='translate(0,154) scale(0.1,-0.1)' fill='%23fff' stroke='none'%3E%3Cpath d='M945 1296 c-102 -44 -124 -181 -41 -254 140 -123 338 67 219 209 -47 55 -116 72 -178 45z'/%3E%3Cpath d='M2405 1296 c-42 -18 -83 -69 -91 -112 -14 -77 44 -166 118 -179 18 -3 288 -5 600 -3 554 3 567 3 594 24 51 38 69 71 69 129 0 58 -18 91 -69 129 -27 21 -39 21 -609 23 -469 2 -588 0 -612 -11z'/%3E%3Cpath d='M405 526 c-42 -18 -83 -69 -91 -112 -14 -77 44 -166 118 -179 18 -3 288 -5 600 -3 554 3 567 3 594 24 51 38 69 71 69 129 0 58 -18 91 -69 129 -27 21 -39 21 -609 23 -469 2 -588 0 -612 -11z'/%3E%3Cpath d='M2945 526 c-102 -44 -124 -181 -41 -254 140 -123 338 67 219 209 -47 55 -116 72 -178 45z'/%3E%3C/g%3E%3C/svg%3E");
        background-repeat: repeat;
        background-size: 30px 12px;
        mask-image: linear-gradient(to bottom, #fff4, transparent);
        mask-repeat: no-repeat;
        mask-size: 100% 100%;
    }

    /* Footer ---------------------------------------------------------- */
    .boxFooter {
        position: absolute;
        display: flex;
        bottom: 2px;
        width: 100%;
        align-items: center;
        gap: 3%;
        font-size: var(--vv-font-footer, 1em);
        z-index: 1;
    }

    .footerCell {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 30%;
        gap: 5%;
        line-height: 1em;
        white-space: nowrap;
    }

    /* Missing entity -------------------------------------------------- */
    .boxSensor1.is-missing,
    .headerEntity.is-missing,
    .boxSensor2.is-missing,
    .footerCell.is-missing {
        opacity: 0.55;
    }

    @media (prefers-reduced-motion: reduce) {
        .gauge {
            transition: none;
        }
    }
`;

export function cssData() {
    return tokens;
}

export default cssData;
