/*
 * Victron Venus Dashboard - rendering engine.
 *
 * Responsibilities:
 *  - build the dashboard skeleton (columns, boxes, anchors) from the config,
 *  - fill the boxes with live Home Assistant states (per entity decimals),
 *  - draw and animate the connection lines between anchors (flow direction),
 *  - fetch and render the history graphs.
 *
 * The module keeps no Home Assistant internals: everything it needs from the
 * frontend is passed in, which makes it testable in a plain browser.
 */

import {
    clamp,
    formatEntityState,
    normalizeConfig,
    numberOr,
    resolveDecimals,
    resolveIsDark,
} from "./lib-config.js";

/** Live link animation controls, keyed by `<box>_<start>-><end>`. */
export const pathControls = new Map();
export const directionControls = new Map();
export const intervals = new Map();
export const historicData = new Map();
export const updateGraphTriggers = new Map();

/** Running `requestAnimationFrame` handles, so they can actually be stopped. */
const animationFrames = new Set();

/** Per box DOM references, built once per configuration. */
const boxRefs = new Map();

let dashboardOldWidth = 0;

let currentConfig = null;

let resizeObserver = null;

const GRAPH_DEFAULTS = { hours: 24, refresh: 15, segments: 6 };

/* ------------------------------------------------------------------ *
 * Card skeleton
 * ------------------------------------------------------------------ */

/** Renders the static part of the dashboard (svg canvas plus columns). */
export function baseRender(config, appendTo) {
    appendTo.innerHTML = `
        <div id="db-container" class="db-container">
            <div id="dashboard" class="dashboard">
                <svg id="svg_container" class="line" viewBox="0 0 1000 600" width="100%" height="100%" aria-hidden="true" focusable="false">
                    <g id="path_container"></g>
                    <g id="circ_container"></g>
                </svg>
                <div id="column-1" class="column column-1"></div>
                <div id="column-2" class="column column-2"></div>
                <div id="column-3" class="column column-3"></div>
            </div>
        </div>
    `;

    const dashboard = appendTo.querySelector("#dashboard");
    if (dashboard) dashboard.style.gap = `${config.layout.gap}%`;

    boxRefs.clear();
    currentConfig = config;
}

/** Creates the boxes ("devices") of every column. */
export function addBox(config, appendTo) {
    config.layout.columns.forEach((count, columnIndex) => {
        const column = appendTo.querySelector(`#dashboard > #column-${columnIndex + 1}`);
        if (!column) {
            console.warn(`Venus dashboard: column ${columnIndex + 1} not found.`);
            return;
        }

        for (let i = 1; i <= count; i += 1) {
            const boxId = `${columnIndex + 1}-${i}`;

            const box = document.createElement("div");
            box.id = `box_${boxId}`;
            box.className = "box";

            const graph = document.createElement("div");
            graph.id = `graph_${boxId}`;
            graph.className = "graph";

            const gauge = document.createElement("div");
            gauge.id = `gauge_${boxId}`;
            gauge.className = "gauge";
            gauge.style.height = "0px";

            const content = document.createElement("div");
            content.id = `content_${boxId}`;
            content.className = "content";

            box.append(graph, gauge, content);
            column.appendChild(box);
        }
    });
}

/** Creates the anchors declared by every device (`anchors: "L-1, B-2"`). */
export function addAnchors(config, appendTo) {
    Object.values(config.devices).forEach((device) => {
        if (device.anchors.length === 0) return;

        const column = parseInt(device.key[0], 10);
        const boxElement = appendTo.querySelector(
            `#dashboard > #column-${column} > #box_${device.key}`
        );
        if (!boxElement) {
            console.error(`Venus dashboard: box "box_${device.key}" not found.`);
            return;
        }

        device.anchors.forEach(({ side, qty }) => {
            for (let i = 1; i <= qty; i += 1) {
                const anchor = document.createElement("div");
                anchor.className = `anchor anchor-${side}`;
                anchor.id = `anchor_${device.key}_${side}-${i}`;

                // Evenly distributed: 1 anchor at 50%, 2 anchors at 33% and 67%, ...
                const position = (i / (qty + 1)) * 100;
                if (side === "T" || side === "B") {
                    anchor.style.left = `${position}%`;
                } else {
                    anchor.style.top = `${position}%`;
                }
                boxElement.appendChild(anchor);
            }
        });
    });
}

/* ------------------------------------------------------------------ *
 * Box content
 * ------------------------------------------------------------------ */

const AUTO_FONT = {
    header: { other: [0.0945, 2.209], center: [0.0693, 1.9854] },
    sensor: { other: [0.1452, 9.0806], center: [0.1065, 8.7929] },
    sensor2: { other: [0.0945, 2.209], center: [0.0693, 1.9854] },
    footer: { other: [0.1095, -2.1791], center: [0.0803, -2.438] },
};

/**
 * The original card scaled the fonts with the box width, which still works for
 * `auto`; an explicit size is handled by the `--vv-font-*` variables in CSS.
 */
function autoFontSize(kind, columnIndex, width) {
    const factors = AUTO_FONT[kind] || AUTO_FONT.sensor;
    const [slope, offset] = columnIndex === 2 ? factors.center : factors.other;
    const size = Math.round(slope * width + offset);
    return `${clamp(size, 6, 96)}px`;
}

function setText(element, text, isMissing) {
    if (!element) return;
    if (element.textContent !== text) element.textContent = text;
    element.classList.toggle("is-missing", Boolean(isMissing));
}

/**
 * Writes a formatted value into its own span. The value and the unit must stay
 * separate elements, so the text is never written to the container itself.
 */
function setValue(container, span, text, isMissing) {
    if (span && span.textContent !== text) span.textContent = text;
    container?.classList.toggle("is-missing", Boolean(isMissing));
}

function setHidden(element, hidden) {
    if (!element) return;
    element.hidden = Boolean(hidden);
}

function openMoreInfo(target, entityId) {
    if (!entityId) return;
    target.dispatchEvent(
        new CustomEvent("hass-more-info", {
            detail: { entityId },
            bubbles: true,
            composed: true,
        })
    );
}

function createBoxContent(boxId, device, appendTo) {
    const parent = `#dashboard > #column-${boxId[0]} > #box_${boxId}`;
    const content = appendTo.querySelector(`${parent} > #content_${boxId}`);
    if (!content) return null;

    const icon = document.createElement("ha-icon");
    icon.className = "boxIcon";

    const title = document.createElement("div");
    title.className = "boxTitle";

    const headerEntity = document.createElement("div");
    headerEntity.className = "headerEntity";
    const headerValue = document.createElement("span");
    headerValue.className = "boxValue";
    const headerUnit = document.createElement("div");
    headerUnit.className = "boxUnit";
    headerEntity.append(headerValue, headerUnit);

    const header = document.createElement("div");
    header.className = "boxHeader";
    header.append(icon, title, headerEntity);

    const sensor1 = document.createElement("div");
    sensor1.className = "boxSensor1";
    const sensor1Value = document.createElement("span");
    sensor1Value.className = "boxValue";
    const sensor1Unit = document.createElement("div");
    sensor1Unit.className = "boxUnit";
    sensor1.append(sensor1Value, sensor1Unit);

    const sensor2 = document.createElement("div");
    sensor2.className = "boxSensor2";
    const sensor2Value = document.createElement("span");
    sensor2Value.className = "boxValue";
    const sensor2Unit = document.createElement("div");
    sensor2Unit.className = "boxUnit";
    sensor2.append(sensor2Value, sensor2Unit);

    const footer = document.createElement("div");
    footer.className = "boxFooter";
    const footerCells = [0, 1, 2].map(() => {
        const cell = document.createElement("div");
        cell.className = "footerCell";
        const value = document.createElement("span");
        value.className = "boxValue";
        const unit = document.createElement("div");
        unit.className = "boxUnit";
        cell.append(value, unit);
        footer.appendChild(cell);
        return { cell, value, unit };
    });

    content.append(header, sensor1, sensor2, footer);

    const refs = {
        device,
        box: content.closest(".box"),
        content,
        header,
        icon,
        title,
        headerEntity,
        headerValue,
        headerUnit,
        sensor1,
        sensor1Value,
        sensor1Unit,
        sensor2,
        sensor2Value,
        sensor2Unit,
        footer,
        footerCells,
        graph: appendTo.querySelector(`${parent} > #graph_${boxId}`),
        gauge: appendTo.querySelector(`${parent} > #gauge_${boxId}`),
        hasGraph: false,
    };

    // Graphs only appear once the history has been fetched.
    if (refs.graph) refs.graph.hidden = true;

    content.setAttribute("role", "button");
    content.setAttribute("tabindex", "0");
    content.title = device.name || "";

    content.addEventListener("click", () => openMoreInfo(content, device.entity));
    content.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openMoreInfo(content, device.entity);
        }
    });

    boxRefs.set(boxId, refs);
    return refs;
}

function updateBox(boxId, refs, config, hass, width) {
    const device = refs.device;
    const numbers = config.numbers;

    if (refs.icon.icon !== (device.icon || "")) refs.icon.icon = device.icon || "";
    setText(refs.title, device.name || "", false);

    const header = formatEntityState(
        hass,
        device.headerEntity,
        resolveDecimals(config, device, "header"),
        numbers
    );
    setValue(refs.headerEntity, refs.headerValue, header.value, header.missing);
    setText(refs.headerUnit, header.unit, false);
    setHidden(refs.headerEntity, !device.headerEntity);

    const main = formatEntityState(
        hass,
        device.entity,
        resolveDecimals(config, device, "main"),
        numbers
    );
    setValue(refs.sensor1, refs.sensor1Value, main.value, main.missing);
    setText(refs.sensor1Unit, main.unit, false);

    const second = formatEntityState(
        hass,
        device.entity2,
        resolveDecimals(config, device, "entity2"),
        numbers
    );
    setValue(refs.sensor2, refs.sensor2Value, second.value, second.missing);
    setText(refs.sensor2Unit, second.unit, false);
    setHidden(refs.sensor2, !device.entity2);

    const footerEntities = [device.footerEntity1, device.footerEntity2, device.footerEntity3];
    const footerSlots = ["footer1", "footer2", "footer3"];
    refs.footerCells.forEach((cell, index) => {
        const formatted = formatEntityState(
            hass,
            footerEntities[index],
            resolveDecimals(config, device, footerSlots[index]),
            numbers
        );
        setHidden(cell.cell, !footerEntities[index]);
        setValue(cell.cell, cell.value, formatted.value, formatted.missing);
        setText(cell.unit, formatted.unit, false);
    });
    setHidden(refs.footer, footerEntities.every((entityId) => !entityId));

    const unavailable = device.entity ? main.missing : main.missing && !device.icon;
    refs.box?.classList.toggle("is-unavailable", Boolean(unavailable));

    // Fonts: "auto" keeps the historic width based scaling.
    const column = parseInt(boxId[0], 10);
    const applyFont = (kind, element) => {
        if (!element) return;
        const value = config.typography[kind];
        element.style.fontSize = value === "auto" ? autoFontSize(kind, column, width) : "";
    };
    applyFont("header", refs.header);
    applyFont("sensor", refs.sensor1);
    applyFont("sensor2", refs.sensor2);
    applyFont("footer", refs.footer);

    // Gauge: a percentage of the box height, meaningful for 0-100 values only.
    if (device.gauge && refs.gauge) {
        const numeric = numberOr(hass?.states?.[device.entity]?.state, null);
        refs.gauge.style.height = numeric === null ? "0px" : `${clamp(numeric, 0, 100)}%`;
    } else if (refs.gauge) {
        refs.gauge.style.height = "0px";
    }

    if (device.graph && !refs.hasGraph) {
        refs.hasGraph = true;
        creatGraph(refs);
    }
}

/** Fills (or refreshes) every configured box. */
export function fillBox(config, hass, appendTo) {
    const boxes = [];

    Object.values(config.devices).forEach((device) => {
        const column = parseInt(device.key[0], 10);
        const box = parseInt(device.key[2], 10);
        const max = config.layout.columns[column - 1];
        if (!Number.isFinite(max) || box > max) {
            console.error(`Venus dashboard: box "${device.key}" has no space in column ${column}.`);
            return;
        }

        const refs = boxRefs.get(device.key) || createBoxContent(device.key, device, appendTo);
        if (refs) boxes.push([device.key, refs]);
    });

    // All boxes exist now, so their widths can be read in one go. Reading them
    // while values are being written would force a layout per box.
    const widths = new Map(boxes.map(([boxId, refs]) => [boxId, refs.content.offsetWidth]));

    boxes.forEach(([boxId, refs]) => updateBox(boxId, refs, config, hass, widths.get(boxId)));
}

/* ------------------------------------------------------------------ *
 * History graphs
 * ------------------------------------------------------------------ */

function creatGraph(refs) {
    const entityId = refs.device.entity;
    const data = historicData.get(entityId);
    if (!data || data.length === 0) {
        setHidden(refs.graph, true);
        return;
    }

    const pathData = generatePath(data, 500, 99);
    setHidden(refs.graph, false);
    refs.graph.innerHTML = `
        <svg viewBox="0 0 500 100" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" style="width: 100%; height: 100%;">
            <path fill="none" stroke-width="3" d="${pathData}" />
        </svg>
    `;

    updateGraphTriggers.set(entityId, false);
}

function generatePath(data, svgWidth = 500, svgHeight = 100) {
    if (!data || data.length === 0) return "";

    const values = data.map((point) => point.value);
    const minY = Math.min(...values);
    const maxY = Math.max(...values);
    const span = maxY - minY || 1;

    const points = data.map((point, index) => ({
        x: (index / Math.max(data.length - 1, 1)) * svgWidth,
        y: svgHeight - ((point.value - minY) / span) * svgHeight,
    }));

    let path = `M${points[0].x},${points[0].y}`;
    for (let i = 1; i < points.length; i += 1) {
        const previous = points[i - 1];
        const current = points[i];
        const midX = (previous.x + current.x) / 2;
        path += ` Q${previous.x},${previous.y} ${midX},${current.y}`;
    }
    const last = points[points.length - 1];
    path += ` T${last.x},${last.y}`;
    return path;
}

/** Douglas-Peucker simplification, used to keep long histories cheap to draw. */
export function simplifyPath(points, tolerance) {
    if (points.length <= 2) return points;

    const squaredTolerance = tolerance * tolerance;

    const squaredDistance = (point, start, end) => {
        let x = start.x;
        let y = start.y;
        const dx = end.x - x;
        const dy = end.y - y;

        if (dx !== 0 || dy !== 0) {
            const t = ((point.x - x) * dx + (point.y - y) * dy) / (dx * dx + dy * dy);
            if (t > 1) {
                x = end.x;
                y = end.y;
            } else if (t > 0) {
                x += dx * t;
                y += dy * t;
            }
        }
        const ddx = point.x - x;
        const ddy = point.y - y;
        return ddx * ddx + ddy * ddy;
    };

    const simplified = [points[0]];
    const stack = [[0, points.length - 1]];

    while (stack.length > 0) {
        const [start, end] = stack.pop();
        let maxDistance = squaredTolerance;
        let index = -1;

        for (let i = start + 1; i < end; i += 1) {
            const distance = squaredDistance(points[i], points[start], points[end]);
            if (distance > maxDistance) {
                maxDistance = distance;
                index = i;
            }
        }

        if (index !== -1) {
            if (index - start > 1) stack.push([start, index]);
            simplified.push(points[index]);
            if (end - index > 1) stack.push([index, end]);
        }
    }

    simplified.push(points[points.length - 1]);
    simplified.sort((a, b) => a.x - b.x);
    return simplified;
}

/* ------------------------------------------------------------------ *
 * Connection lines
 * ------------------------------------------------------------------ */

export function redrawLines(config, appendTo) {
    const dashboard = appendTo.querySelector("#dashboard");
    if (!dashboard) return;

    const pathContainer = dashboard.querySelector("#svg_container > #path_container");
    const circContainer = dashboard.querySelector("#svg_container > #circ_container");
    if (!pathContainer || !circContainer) return;

    stopAllAnimations();
    pathContainer.innerHTML = "";
    circContainer.innerHTML = "";
    pathControls.clear();
    directionControls.clear();

    Object.values(config.devices).forEach((device) => {
        device.links.forEach((link) => {
            const startId = `${device.key}_${link.start}`;
            creatLine(
                `${startId}->${link.end}`,
                startId,
                link.end,
                link,
                config,
                pathContainer,
                circContainer,
                appendTo
            );
        });
    });

    dashboardOldWidth = dashboard.getBoundingClientRect().width;
}

/** Rebuilds the lines when the card was resized. */
export function checkReSize(config, appendTo) {
    const dashboard = appendTo.querySelector("#dashboard");
    if (!dashboard) return;
    const width = dashboard.getBoundingClientRect().width;
    if (width > 0 && width !== dashboardOldWidth) {
        redrawLines(config, appendTo);
    }
}

/** Watches the dashboard size so the lines survive responsive layouts. */
export function observeDashboard(appendTo, callback) {
    const dashboard = appendTo.querySelector("#dashboard");
    if (!dashboard || typeof ResizeObserver === "undefined") return;

    disconnectObserver();
    resizeObserver = new ResizeObserver(() => callback());
    resizeObserver.observe(dashboard);
}

function disconnectObserver() {
    if (resizeObserver) {
        resizeObserver.disconnect();
        resizeObserver = null;
    }
}

function linkDirection(link, config) {
    return link.direction === "auto" ? config.links.direction : link.direction;
}

function buildPathData(coords1, coords2, anchorId1, anchorId2, curve) {
    if (coords1.x === coords2.x || coords1.y === coords2.y || curve === "straight") {
        return `M ${coords1.x} ${coords1.y} L ${coords2.x} ${coords2.y}`;
    }

    const anchor1IsHorizontal = anchorId1.includes("L") || anchorId1.includes("R");
    const anchor2IsHorizontal = anchorId2.includes("L") || anchorId2.includes("R");

    if (anchor1IsHorizontal && anchor2IsHorizontal) {
        const midX = (coords1.x + coords2.x) / 2;
        return `
            M ${coords1.x} ${coords1.y}
            C ${midX} ${coords1.y}, ${midX} ${coords1.y}, ${midX} ${(coords1.y + coords2.y) / 2}
            C ${midX} ${coords2.y}, ${midX} ${coords2.y}, ${coords2.x} ${coords2.y}
        `;
    }

    if (!anchor1IsHorizontal && !anchor2IsHorizontal) {
        const midY = (coords1.y + coords2.y) / 2;
        return `
            M ${coords1.x} ${coords1.y}
            C ${coords1.x} ${midY}, ${coords1.x} ${midY}, ${(coords1.x + coords2.x) / 2} ${midY}
            C ${coords2.x} ${midY}, ${coords2.x} ${midY}, ${coords2.x} ${coords2.y}
        `;
    }

    let from = coords1;
    let to = coords2;
    if (anchor1IsHorizontal) {
        from = coords2;
        to = coords1;
    }
    return `
        M ${from.x} ${from.y}
        C ${from.x} ${to.y}, ${from.x} ${to.y}, ${to.x} ${to.y}
    `;
}

function creatLine(linkId, anchorId1, anchorId2, link, config, pathContainer, circContainer, appendTo) {
    const coords1 = getAnchorCoordinates(anchorId1, appendTo);
    const coords2 = getAnchorCoordinates(anchorId2, appendTo);

    if (!coords1 || !coords2) {
        console.error(`Venus dashboard: impossible to calculate coordinates for ${linkId}.`);
        return;
    }

    const curve = link.curve || config.links.curve;
    const pathData = buildPathData(coords1, coords2, anchorId1, anchorId2, curve);
    if (pathData.includes("NaN")) {
        console.warn(`Venus dashboard: ignoring SVG path with NaN (${linkId}).`);
        return;
    }

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", pathData);
    pathContainer.appendChild(path);

    const direction = linkDirection(link, config);
    const balls = [];
    if (direction !== "off" && config.links.ballSize > 0) {
        const ball = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        ball.setAttribute("r", `${config.links.ballSize}`);
        ball.setAttribute("cx", coords1.x);
        ball.setAttribute("cy", coords1.y);
        circContainer.appendChild(ball);
        balls.push(ball);

        if (direction === "both") {
            const reverseBall = ball.cloneNode(false);
            reverseBall.setAttribute("cx", coords2.x);
            reverseBall.setAttribute("cy", coords2.y);
            circContainer.appendChild(reverseBall);
            balls.push(reverseBall);
        }
    }

    const state = {
        path,
        balls,
        direction: direction === "both" ? "forward" : direction,
        animate: config.links.animate && balls.length > 0 && !prefersReducedMotion(),
        frame: null,
        startTime: 0,
        progress: 0,
    };

    directionControls.set(linkId, state);
    pathControls.set(linkId, {
        reverse: (factor) => {
            state.direction = factor === 0 ? "idle" : factor < 0 ? "reverse" : "forward";
        },
    });

    if (state.animate) {
        state.frame = requestAnimationFrame((time) => moveBalls(state, time, appendTo));
        if (state.frame) animationFrames.add(state.frame);
    } else {
        parkBalls(state);
    }
}

/** Places the balls statically while still showing the direction of the flow. */
function parkBalls(state) {
    if (state.balls.length === 0) return;
    const length = state.path.getTotalLength();
    const position = state.direction === "reverse" ? 0.9 : 0.1;
    const point = state.path.getPointAtLength(position * length);
    state.balls[0].setAttribute("cx", point.x);
    state.balls[0].setAttribute("cy", point.y);

    if (state.balls.length > 1) {
        const other = state.path.getPointAtLength((1 - position) * length);
        state.balls[1].setAttribute("cx", other.x);
        state.balls[1].setAttribute("cy", other.y);
    }
}

function moveBalls(state, time, appendTo) {
    const dashboard = appendTo.querySelector("#dashboard");
    if (!dashboard || !state.path.isConnected) {
        stopAllAnimations();
        return;
    }

    const pathLength = state.path.getTotalLength();
    const dashboardWidth = dashboard.offsetWidth || 900;
    const speed = dashboardWidth / (currentConfig?.links?.speed || 10);
    const duration = (pathLength / speed) * 1000;
    if (!state.startTime) state.startTime = time;

    if (state.direction !== "idle" && pathLength > 0 && Number.isFinite(duration) && duration > 0) {
        state.progress = ((time - state.startTime) % duration) / duration;
    }

    state.balls.forEach((ball, index) => {
        let progress = state.progress;
        if (state.direction === "reverse") progress = 1 - progress;
        if (state.direction === "idle") progress = 0;
        // The second ball of a bidirectional link travels the other way around.
        if (index === 1) progress = 1 - progress;
        const point = state.path.getPointAtLength(progress * pathLength);
        ball.setAttribute("cx", point.x);
        ball.setAttribute("cy", point.y);
    });

    state.frame = requestAnimationFrame((next) => moveBalls(state, next, appendTo));
    if (state.frame) animationFrames.add(state.frame);
}

/** Cancels every running animation. Safe to call multiple times. */
export function stopAllAnimations() {
    animationFrames.forEach((frame) => cancelAnimationFrame(frame));
    animationFrames.clear();
    directionControls.forEach((state) => {
        state.frame = null;
        state.animate = false;
    });
}

function prefersReducedMotion() {
    return (
        typeof window !== "undefined" &&
        typeof window.matchMedia === "function" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
}

function getAnchorCoordinates(anchorId, appendTo) {
    const columnIndex = anchorId[0];
    const boxIndex = anchorId.substring(0, 3);

    const anchor = appendTo.querySelector(
        `#dashboard > #column-${columnIndex} > #box_${boxIndex} > #anchor_${anchorId}`
    );
    const container = appendTo.querySelector("#dashboard");

    if (!anchor || !container) {
        console.error(`Venus dashboard: anchor or container not found: ${anchorId}`);
        return null;
    }

    const anchorRect = anchor.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    if (containerRect.width === 0 || containerRect.height === 0) return null;

    const x = ((anchorRect.left - containerRect.left + anchorRect.width / 2) * 1000) / containerRect.width;
    const y = ((anchorRect.top - containerRect.top + anchorRect.height / 2) * 600) / containerRect.height;

    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    return { x: parseFloat(x.toFixed(2)), y: parseFloat(y.toFixed(2)) };
}

/**
 * Keeps the flow direction of `auto` links in sync with their entity: a positive
 * value flows from start to end, a negative one flows the other way. Links
 * without a usable value keep flowing forward instead of freezing.
 */
export function updateFlowDirections(config, hass) {
    Object.values(config.devices).forEach((device) => {
        device.links.forEach((link) => {
            if (linkDirection(link, config) !== "auto") return;

            const control = pathControls.get(`${device.key}_${link.start}->${link.end}`);
            if (!control || typeof control.reverse !== "function") return;

            const numeric = numberOr(hass?.states?.[link.entity]?.state, null);
            if (numeric === null) control.reverse(1);
            else if (numeric < -0.5) control.reverse(-1);
            else if (numeric > 0.5) control.reverse(1);
            else control.reverse(0);
        });
    });
}

/* ------------------------------------------------------------------ *
 * History retrieval
 * ------------------------------------------------------------------ */

function graphSettings(config) {
    const source = config?.raw?.graphs;
    return {
        hours: clamp(numberOr(source?.hours, GRAPH_DEFAULTS.hours), 1, 168),
        refresh: clamp(numberOr(source?.refresh, GRAPH_DEFAULTS.refresh), 1, 1440),
        segments: clamp(numberOr(source?.segments, GRAPH_DEFAULTS.segments), 1, 24),
    };
}

/** Starts the periodic history retrieval for every device with a graph. */
export async function startPeriodicTask(config, hass) {
    clearIntervals();

    const { refresh, hours, segments } = graphSettings(config);
    const entities = [
        ...new Set(
            Object.values(config.devices)
                .filter((device) => device.graph && device.entity)
                .map((device) => device.entity)
        ),
    ];
    if (entities.length === 0) return true;

    for (const entityId of entities) {
        const ok = await fetchHistoricalData(entityId, hours, hass, segments);
        if (!ok) {
            console.warn(`Venus dashboard: no history for ${entityId}, the graph stays empty.`);
            continue;
        }
        updateGraphTriggers.set(entityId, true);
        intervals.set(
            entityId,
            setInterval(() => fetchHistoricalData(entityId, hours, hass, segments), refresh * 60 * 1000)
        );
    }
    return true;
}

/** Stops the history intervals without touching the running animations. */
function clearIntervals() {
    intervals.forEach((intervalId) => clearInterval(intervalId));
    intervals.clear();
}

/** Stops every interval, animation and observer. */
export function clearAllIntervals() {
    clearIntervals();
    stopAllAnimations();
    disconnectObserver();
}

/** Full cleanup, used when the card is removed from the DOM. */
export function destroy() {
    clearAllIntervals();
    boxRefs.clear();
    historicData.clear();
    updateGraphTriggers.clear();
    pathControls.clear();
    directionControls.clear();
    currentConfig = null;
    dashboardOldWidth = 0;
}

async function fetchHistoricalData(entityId, periodInHours = 24, hass, numSegments = 6) {
    const now = new Date();
    const startTime = new Date(now.getTime() - periodInHours * 60 * 60 * 1000);

    if (!hass?.states?.[entityId]) {
        console.error(`Venus dashboard: entity ${entityId} is not available.`);
        return false;
    }

    const url = `history/period/${startTime.toISOString()}?filter_entity_id=${entityId}&minimal_response=true&significant_changes_only=true`;

    try {
        const response = await hass.callApi("GET", url);
        if (!Array.isArray(response) || response.length === 0 || response[0].length === 0) {
            return false;
        }

        const formatted = response[0]
            .map((item) => ({
                time: new Date(item.last_changed || item.last_updated),
                state: parseFloat(item.state),
            }))
            .filter((item) => Number.isFinite(item.state) && !Number.isNaN(item.time.getTime()));

        if (formatted.length === 0) return false;

        const buckets = 48;
        const interval = (periodInHours * 60 * 60 * 1000) / buckets;
        const startTimestamp = Math.floor(startTime.getTime() / interval) * interval;
        const reduced = [];

        for (let i = 0; i < buckets; i += 1) {
            const target = new Date(startTimestamp + i * interval);
            const closest = formatted.reduce((previous, current) =>
                Math.abs(current.time - target) < Math.abs(previous.time - target) ? current : previous
            );
            reduced.push({ time: target, value: closest.state });
        }

        // Keep the extremes of every segment so peaks survive the reduction.
        const segmentSize = Math.ceil(formatted.length / numSegments);
        for (let i = 0; i < formatted.length; i += segmentSize) {
            const segment = formatted.slice(i, i + segmentSize);
            let min = { value: Infinity, time: null };
            let max = { value: -Infinity, time: null };
            segment.forEach((point) => {
                if (point.state < min.value) min = { value: point.state, time: point.time };
                if (point.state > max.value) max = { value: point.state, time: point.time };
            });
            if (min.time) reduced.push({ time: min.time, value: min.value });
            if (max.time) reduced.push({ time: max.time, value: max.value });
        }

        reduced.sort((a, b) => a.time - b.time);
        historicData.set(entityId, reduced);
        return true;
    } catch (error) {
        console.error("Venus dashboard: error retrieving history:", error);
        return false;
    }
}

/* ------------------------------------------------------------------ *
 * Entry point used by the card element
 * ------------------------------------------------------------------ */

/**
 * Rebuilds the whole dashboard. `hass` is optional so the demo mode (and the
 * tests) can render the card without a Home Assistant connection.
 */
export function renderDashboard(rawConfig, appendTo, hass) {
    const config = normalizeConfig(rawConfig);
    if (hass) config.isDark = resolveIsDark(config.theme, hass.themes?.darkMode);

    baseRender(config, appendTo);

    if (!config.demo) {
        addBox(config, appendTo);
        addAnchors(config, appendTo);
        if (hass) fillBox(config, hass, appendTo);
        redrawLines(config, appendTo);
        observeDashboard(appendTo, () => checkReSize(config, appendTo));
    }

    return config;
}
