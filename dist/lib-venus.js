export let pathControls = new Map();

export let directionControls = new Map();

export let intervals = new Map();

export let historicData = new Map();

export let updateGraphTriggers = new Map();

let dashboardOldWidth;

let mustRedrawLine = true;

let editorOpen = false;

/************************************************/
/* Card skeleton rendering function:            */
/* Renders an image if mode = DEMO in YAML      */
/************************************************/
export function baseRender(config, appendTo) {
    
    appendTo.innerHTML = `
	    <div id="dashboard" class="dashboard">
    		<svg id="svg_container" class="line" viewBox="0 0 1000 600" width="100%" height="100%">
    			<defs>
    				<filter id="blurEffect">
    					<feGaussianBlur in="SourceGraphic" stdDeviation="1"/> </filter>
    				<radialGradient id="gradientDark" cx="50%" cy="50%" r="50%">
    					<stop offset="0%" stop-color="#ffffff" stop-opacity="1"></stop>
    					<stop offset="90%" stop-color="#ffffff" stop-opacity="0"></stop>
    				</radialGradient>
    				<radialGradient id="gradientLight" cx="50%" cy="50%" r="50%">
    					<stop offset="0%" stop-color="#000000" stop-opacity="1"></stop>
    					<stop offset="90%" stop-color="#000000" stop-opacity="0"></stop>
    				</radialGradient>
    			</defs>
        		<g id="path_container" class="balls"></g>
    			<g id="circ_container" class="lines"></g>
    		</svg>
            <div id="column-1" class="column column-1"></div>
            <div id="column-2" class="column column-2"></div>
            <div id="column-3" class="column column-3"></div>
        </div>
	`;

}

/**********************************/
/* Box creation function:         */
/* Qty per col                    */
/**********************************/
export function addBox(col1, col2, col3, appendTo) {
    
    const boxCounts = [col1, col2, col3];
    
    boxCounts.forEach((count, columnIndex) => {
        const column = appendTo.querySelector(`#dashboard > #column-${columnIndex + 1}`); // Access columns via querySelector

        if (column) {
            const gapPercentage = count === 3 ? '5%' : count === 2 ? '10%' : '0';
            column.style.gap = gapPercentage; // Apply gap to column

            for (let i = 1; i <= count; i++) {
                
                const content = document.createElement('div'); // Create a new div element
                content.id = `content_${columnIndex + 1}-${i}`; // Set the box id
                content.className = 'content'; // Apply 'content' class
                
                const graph = document.createElement('div'); // Create a new div element
                graph.id = `graph_${columnIndex + 1}-${i}`;
                graph.className = 'graph';
                
                const gauge = document.createElement('div'); // Create a new div element
                gauge.id = `gauge_${columnIndex + 1}-${i}`;
                gauge.className = 'gauge';
                gauge.style.height = `0px`;
                
                const box = document.createElement('div'); // Create a new div element
                box.id = `box_${columnIndex + 1}-${i}`; // Set the box id
                box.className = 'box'; // Apply 'box' class
                box.appendChild(graph);
                box.appendChild(gauge);
                box.appendChild(content);
                column.appendChild(box); // Add the box to the column
            }
        } else {
            console.warn(`Column ${columnIndex + 1} not found.`);
        }
    });
}

/****************************************/
/* Anchor addition function:            */
/* Lists anchors to create in boxes     */
/* then launches creatAnchors function  */
/* based on YAML params                 */
/****************************************/
export function addAnchors(config, appendTo) {
    
    // Iterate through all devices in configuration
    Object.entries(config.devices || {}).forEach(([boxKey, device]) => {
        if (device?.anchors) {
            // Extract anchors defined for the device
            const anchors = device.anchors.split(', ').map((anchors) => {
                const [type, qtyStr] = anchors.split('-'); // Example: "R-1" becomes ["R", "1"]
                const qty = parseInt(qtyStr, 10); // Quantity of anchors to create
                return { box: boxKey, type, qty };
            });

            // Process each anchor
            anchors.forEach(({ type, qty }) => {
                const col = parseInt(boxKey[0], 10); // First part of boxKey (column)
                const box = parseInt(boxKey[2], 10); // Third part of boxKey (box)
                
                // Call creatAnchors function
                creatAnchors(col, box, qty, type, appendTo);
            });
        }
    });
}

/****************************************/
/* Anchor creation function:            */
/* Receives col, box, number to create  */
/* per side, and side (position)        */
/****************************************/
function creatAnchors(colNbrs, boxNbrs, numAnchors, type, appendTo) {
	const box = appendTo.querySelector(`#dashboard > #column-${colNbrs} > #box_${colNbrs}-${boxNbrs}`); // Access columns via querySelector
	
	if (!box) {
		console.error(`Box with ID "box_${colNbrs}-${boxNbrs}" not found.`);
		return;
	}

	// Add new anchors
	for (let i = 0; i < numAnchors; i++) {
		const anchor = document.createElement('div');
		
		anchor.className = 'anchor anchor-'+type;
		anchor.id = `anchor_${colNbrs}-${boxNbrs}_${type}-${i+1}`;
		
		// Calculate position of each anchor
		const positionPercent = ((i + 1) / (numAnchors + 1)) * 100; // Evenly distributed
		
		if(type === "T" ||  type === "B")
			anchor.style.left = `${positionPercent}%`;
		else {
			anchor.style.top = `${positionPercent}%`;
		}
		
		// Add anchor to box
		box.appendChild(anchor);
	}
}

/**********************************************/
/* Box filling function:                      */
/* Receives different devices, style or       */
/* string size (defined or auto)              */
/**********************************************/
export function fillBox(config, styles, isDark, hass, appendTo) {
    
    const devices = config.devices || [];
    
    for (const boxId in devices) {
        
        const boxIdtest = parseInt(boxId[2], 10);
        const boxIdmax = parseInt(config.param[`boxCol${boxId[0]}`], 10);
        
        if(boxIdtest > boxIdmax )  {
    		console.error(`Box with ID "${boxIdtest}" not found.`);
    		return;
    	}
            
        const device = devices[boxId];
            
        const divGraph = appendTo.querySelector(`#dashboard > #column-${boxId[0]} > #box_${boxId} > #graph_${boxId}`);
        const divGauge = appendTo.querySelector(`#dashboard > #column-${boxId[0]} > #box_${boxId} > #gauge_${boxId}`);
        const innerContent = appendTo.querySelector(`#dashboard > #column-${boxId[0]} > #box_${boxId} > #content_${boxId}`);
                
        let state = hass.states[device.entity];
        let value = state ? state.state : 'N/C';
        let unit = state && state.attributes.unit_of_measurement ? state.attributes.unit_of_measurement : '';

        // Check if decimals option is set and valid, then format the value
        if (state && !isNaN(parseFloat(state.state)) && device.decimals !== undefined && device.decimals !== null && device.decimals !== "") {
             value = parseFloat(state.state).toFixed(device.decimals);
        }
            
        let addGauge = "";
        let addHeaderEntity = "";
        let addEntity2 = "";
        let addFooter = "";
        let addHeaderStyle = "";
        let addSensorStyle = "";
        let addSensor2Style = "";
        let addFooterStyle = "";
        
        if(device.graph) creatGraph(boxId, device, isDark, appendTo);
        
        if(device.gauge) divGauge.style.height = value + `%`;
        else divGauge.style.height = `0px`;
            
        if(styles.header != "") {
            if(styles.header == "auto") {
                
                let dynSizeHeader = "";
                
                if(boxId[0] == "2") dynSizeHeader = Math.round(0.0693*innerContent.offsetWidth+1.9854);
                else dynSizeHeader = Math.round(0.0945*innerContent.offsetWidth+2.209);

                addHeaderStyle = ` style="font-size: ${dynSizeHeader}px;"`;
                
            } else {
                addHeaderStyle = ` style="font-size: ${styles.header}px;"`;
            }
        } 
        
        if(styles.sensor != "") {
            if(styles.sensor == "auto") {
                    
                let dynSizeSensor = "";
                    
                if(boxId[0] == "2") dynSizeSensor = Math.round(0.1065*innerContent.offsetWidth+8.7929);
                else dynSizeSensor = Math.round(0.1452*innerContent.offsetWidth+9.0806);
                    
                addSensorStyle = ` style="font-size: ${dynSizeSensor}px;"`;
                    
            } else {
                addSensorStyle = ` style="font-size: ${styles.sensor};"`;
            }
        }
        
        if(styles.sensor2 != "") {
            if(styles.sensor == "auto") {
                    
                let dynSizeSensor2 = "";
                    
                if(boxId[0] == "2") dynSizeSensor2 = Math.round(0.0693*innerContent.offsetWidth+1.9854);
                else dynSizeSensor2 = Math.round(0.0945*innerContent.offsetWidth+2.209);
                    
                addSensor2Style = ` style="font-size: ${dynSizeSensor2}px;"`;
                    
            } else {
                addSensor2Style = ` style="font-size: ${styles.sensor2}px;"`
            }
        }
            
        if(styles.footer != "") {
            if(styles.footer == "auto") {
                    
                let dynSizeFooter = "";
                    
                if(boxId[0] == "2") dynSizeFooter = Math.round(0.0803*innerContent.offsetWidth-2.438);
                else dynSizeFooter = Math.round(0.1095*innerContent.offsetWidth-2.1791);
                    
                addFooterStyle = ` style="font-size: ${dynSizeFooter}px;"`;
                    
            } else {
                addFooterStyle = ` style="font-size: ${styles.footer};"`;
            }
        }
            
        if(device.headerEntity) {
            const stateHeaderEnt = hass.states[device.headerEntity];
            const valueHeaderEnt = stateHeaderEnt ? stateHeaderEnt.state : '';
            const unitvalueHeaderEnt = stateHeaderEnt && stateHeaderEnt.attributes.unit_of_measurement ? stateHeaderEnt.attributes.unit_of_measurement : '';
                
            addHeaderEntity = `
                <div class="headerEntity">${valueHeaderEnt}<div class="boxUnit">${unitvalueHeaderEnt}</div></div>
            `;
        }
        
        if(device.entity2) {
            const stateEntity2 = hass.states[device.entity2];
            const valueEntity2 = stateEntity2 ? stateEntity2.state : '';
            const unitvalueEntity2 = stateEntity2 && stateEntity2.attributes.unit_of_measurement ? stateEntity2.attributes.unit_of_measurement : '';
                
            addEntity2 = `
                <div class="boxSensor2"${addSensor2Style}>${valueEntity2}<div class="boxUnit">${unitvalueEntity2}</div></div>
            `;
        }
            
        if(device.footerEntity1) {
                
            const stateFooterEnt1 = hass.states[device.footerEntity1];
            const valueFooterEnt1 = stateFooterEnt1 ? stateFooterEnt1.state : '';
            const unitvalueFooterEnt1 = stateFooterEnt1 && stateFooterEnt1.attributes.unit_of_measurement ? stateFooterEnt1.attributes.unit_of_measurement : '';
                
            const stateFooterEnt2 = hass.states[device.footerEntity2];
            const valueFooterEnt2 = stateFooterEnt2 ? stateFooterEnt2.state : '';
            const unitvalueFooterEnt2 = stateFooterEnt2 && stateFooterEnt2.attributes.unit_of_measurement ? stateFooterEnt2.attributes.unit_of_measurement : '';
                
            const stateFooterEnt3 = hass.states[device.footerEntity3];
            const valueFooterEnt3 = stateFooterEnt3 ? stateFooterEnt3.state : '';
            const unitvalueFooterEnt3 = stateFooterEnt3 && stateFooterEnt3.attributes.unit_of_measurement ? stateFooterEnt3.attributes.unit_of_measurement : '';
            
            addFooter = `
                <div class="boxFooter"${addFooterStyle}>
                    <div class="footerCell">${valueFooterEnt1}<div class="boxUnit">${unitvalueFooterEnt1}</div></div>
                    <div class="footerCell">${valueFooterEnt2}<div class="boxUnit">${unitvalueFooterEnt2}</div></div>
                    <div class="footerCell">${valueFooterEnt3}<div class="boxUnit">${unitvalueFooterEnt3}</div></div>
                </div>
            `;
        }
            
        innerContent.innerHTML = `
            <div class="boxHeader"${addHeaderStyle}>
                <ha-icon icon="${device.icon}" class="boxIcon"></ha-icon>
                <div class="boxTitle">${device.name}</div>
                ${addHeaderEntity}
            </div>
            <div class="boxSensor1"${addSensorStyle}>${value}<div class="boxUnit">${unit}</div></div>
            ${addEntity2}
            ${addFooter}
        `;
        
        if (!innerContent.dataset.listener) {
            innerContent.dataset.listener = "true"; // Marks as having a listener
        
            innerContent.addEventListener('click', () => {
                const entityId = device.entity; // Entity associated with div
        
                // Trigger Home Assistant "more-info" event
                const event = new Event('hass-more-info', { bubbles: true, composed: true });
                event.detail = { entityId }; // Pass entity to display
                innerContent.dispatchEvent(event);
            });
        }
    }
}

function creatGraph (boxId, device, isDark, appendTo) {
    
    if(!updateGraphTriggers.get(device.entity)) return;
    
    const divGraph = appendTo.querySelector(`#dashboard > #column-${boxId[0]} > #box_${boxId} > #graph_${boxId}`);
    const data = historicData.get(device.entity);
    
    if (!data || data.length === 0) {
        console.warn(`No data for entity ${device.entity}.`);
        return;
    }
    
    //console.log(data);
    if (!data || data.length === 0) {
        console.warn(`Data not available for ${device.entity}.`);
        updateGraphTriggers.set(device.entity, false); // Temporarily disable trigger
        return;
    }
    
    // Generate SVG path
    const pathD = generatePath(data, 500, 99); // SVG dimensions fixed for this example

    let colorPath = "#00000077";
    if(isDark) {
        colorPath = "#ffffff77";
    } 
    
    divGraph.innerHTML = `
        <svg viewBox="0 0 500 100" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" style="width: 100%; height: 100%;">
            <path fill="none" stroke="${colorPath}" stroke-width="3" d="${pathD}" />
        </svg>
    `;

    updateGraphTriggers.set(device.entity, false);
}

function generatePath(data, svgWidth = 500, svgHeight = 100) {
    if (!data || data.length === 0) return '';

    // Step 1: Calculate min/max for normalization
    const minY = Math.min(...data.map(d => d.value));
    const maxY = Math.max(...data.map(d => d.value));

    // Step 2: Normalization of points
    const normalizedData = data.map((d, index) => ({
        x: (index / (data.length - 1)) * svgWidth, // Even distribution of X
        y: svgHeight - ((d.value - minY) / (maxY - minY)) * svgHeight, // Inverted Y normalization (SVG: 0 at top)
    }));

    // Step 3 (optional): Point simplification
    //const simplifiedData = simplifyPath(normalizedData, 3); // Tolerance to adjust
    const simplifiedData = normalizedData;
    
    // Step 4: Path construction
    let path = `M${simplifiedData[0].x},${simplifiedData[0].y}`; // Start point
    for (let i = 1; i < simplifiedData.length; i++) {
        const prev = simplifiedData[i - 1];
        const curr = simplifiedData[i];
        const midX = (prev.x + curr.x) / 2; // Midpoint for fluid curve
        path += ` Q${prev.x},${prev.y} ${midX},${curr.y}`;
    }
    path += ` T${simplifiedData[simplifiedData.length - 1].x},${simplifiedData[simplifiedData.length - 1].y}`; // Last point

    return path;
}

function simplifyPath(points, tolerance) {
    if (points.length <= 2) return points; // No simplification needed if 2 points or less

    const sqTolerance = tolerance * tolerance;

    // Function to calculate squared distance of a point to a line
    function getSqSegmentDistance(p, p1, p2) {
        let x = p1.x, y = p1.y;
        let dx = p2.x - x, dy = p2.y - y;

        if (dx !== 0 || dy !== 0) {
            const t = ((p.x - x) * dx + (p.y - y) * dy) / (dx * dx + dy * dy);
            if (t > 1) {
                x = p2.x;
                y = p2.y;
            } else if (t > 0) {
                x += dx * t;
                y += dy * t;
            }
        }

        dx = p.x - x;
        dy = p.y - y;

        return dx * dx + dy * dy;
    }

    // Main recursive function
    function simplifyRecursive(start, end, sqTolerance, simplified) {
        let maxSqDist = sqTolerance;
        let index;

        for (let i = start + 1; i < end; i++) {
            const sqDist = getSqSegmentDistance(points[i], points[start], points[end]);
            if (sqDist > maxSqDist) {
                index = i;
                maxSqDist = sqDist;
            }
        }

        if (maxSqDist > sqTolerance) {
            if (index - start > 1) simplifyRecursive(start, index, sqTolerance, simplified);
            simplified.push(points[index]);
            if (end - index > 1) simplifyRecursive(index, end, sqTolerance, simplified);
        }
    }

    const simplified = [points[0]];
    simplifyRecursive(0, points.length - 1, sqTolerance, simplified);
    simplified.push(points[points.length - 1]);

    return simplified;
}

/******************************************************/
/* Function to add links between boxes:               */
/* Compares sizes from one "set hass" loop to         */
/* another and if changed launches the addLine        */
/* function (so also on the first loop)               */
/******************************************************/
export function checkReSize(devices, isDarkTheme, appendTo) {
    
    // Recovery of card size for path recalculation if necessary
    const rect = appendTo.querySelector(`#dashboard`).getBoundingClientRect();
    
    // If width different from previous: recalculate
    if(dashboardOldWidth != rect.width) {
        
        // Path and circle container
        const circContainer = appendTo.querySelector(`#dashboard > #svg_container > #circ_container`);
        const pathContainer = appendTo.querySelector(`#dashboard > #svg_container > #path_container`);
            
        // If DOM is ready...
        const checkReady = () => {
            const dashboard = appendTo.querySelector("#dashboard");
        
            if (dashboard) {
                    
                // Verification if main home assistant window is inert (or if conf card window is open)
                const homeAssistant = window.document.querySelector('home-assistant');
                const homeAssistantMain = homeAssistant.shadowRoot.querySelector('home-assistant-main');
                const hasInert = homeAssistantMain.hasAttribute('inert');
                    
                // Different cases...
                if (mustRedrawLine) { // Following a yaml update
                        
                    circContainer.innerHTML = "";
                    pathContainer.innerHTML = "";
                    addLine(devices, isDarkTheme, appendTo);
                        
                } else if(hasInert && !editorOpen) { // First loop on editor opening

                    editorOpen = true;
                        
                    circContainer.innerHTML = "";
                    pathContainer.innerHTML = "";
                    addLine(devices, isDarkTheme, appendTo);
                        
                } else if (hasInert && editorOpen) { // Following loops after first editor opening... no more update
                        
                } else if (!hasInert && editorOpen) {
                        
                    editorOpen = false;

                    circContainer.innerHTML = "";
                    pathContainer.innerHTML = "";
                    addLine(devices, isDarkTheme, appendTo);
                        
                } else {

                    circContainer.innerHTML = "";
                    pathContainer.innerHTML = "";
                    addLine(devices, isDarkTheme, appendTo);
                        
                }
                
                mustRedrawLine = false;
                return; // Stop loop
            }
        
            // Otherwise, reschedule verification
            requestAnimationFrame(checkReady);
        };
        
        // Launch initial verification
        requestAnimationFrame(checkReady);
        
    }
        
    // Update card width in global variable for comparison next round
    dashboardOldWidth = rect.width;
}

export function razDashboardOldWidth() {
    mustRedrawLine = true;
}

/********************************************************/
/* Function to initiate link creation between boxes:    */
/* Retrieves creation params and launches creatLine     */
/* function accordingly                                 */
/********************************************************/
function addLine(devices, isDarkTheme, appendTo) {
	for (const boxId in devices) {
        const device = devices[boxId];
        
        // Loop through numbered links
        const links = device.link;
        
        if(links !== "nolink") {
            for (const linkId in links) {
                const link = links[linkId];
                
                if(link == "nolink") continue;
                
                const inv = link.inv === true ? -1 : 1;          // Default, "inv" is 1 if not defined
                        
                // Display link info
                if (link.start && link.end) creatLine(`${boxId}_${link.start}`, link.end, inv, isDarkTheme, appendTo);
                                
            }
    	}
    }
}

/*********************************************************/
/* Function to create links between boxes:               */
/* Receives start anchor, end anchor, initial animation  */
/* direction                                             */
/*********************************************************/
function creatLine(anchorId1, anchorId2, direction_init, isDarkTheme, appendTo) {
    
    const circContainer = appendTo.querySelector(`#dashboard > #svg_container > #circ_container`);
    const pathContainer = appendTo.querySelector(`#dashboard > #svg_container > #path_container`);

    if (!circContainer) {
		console.error("circContainer not found.");
		return;
	}
	
	if (!pathContainer) {
		console.error("pathContainer not found.");
		return;
	}
	
	var coords1 = getAnchorCoordinates(anchorId1, appendTo);
	var coords2 = getAnchorCoordinates(anchorId2, appendTo);
	
	if (!coords1 || !coords2) {
		console.error("Impossible to calculate coordinates.");
		return;
	}
	
	let pathData = "";
	
	if (coords1.x === coords2.x || coords1.y === coords2.y) {
        pathData = `M ${coords1.x} ${coords1.y} L ${coords2.x} ${coords2.y}`;
    } else {
	
    	const anchor1isH = anchorId1.includes("L") || anchorId1.includes("R");
    	const anchor2isH = anchorId2.includes("L") || anchorId2.includes("R");

    	if (anchor1isH && anchor2isH) {
    		const midX = (coords1.x + coords2.x) / 2;
    		// Path definition with two symmetric curves
    		pathData = `
    			M ${coords1.x} ${coords1.y}
    			C ${midX} ${coords1.y}, ${midX} ${coords1.y}, ${midX} ${(coords1.y + coords2.y) / 2}
    			C ${midX} ${coords2.y}, ${midX} ${coords2.y}, ${coords2.x} ${coords2.y}
    		`;
    	} else if (!anchor1isH && !anchor2isH) {
    		const midY = (coords1.y + coords2.y) / 2;
    		// Path definition with two curves: vertical -> horizontal -> vertical
    		pathData = `
    			M ${coords1.x} ${coords1.y} 
    			C ${coords1.x} ${midY}, ${coords1.x} ${midY}, ${(coords1.x + coords2.x)/2} ${midY} 
    			C ${coords2.x} ${midY}, ${coords2.x} ${midY}, ${coords2.x} ${coords2.y}
    		`;
    	} else {
    		if (anchor1isH) {
    			coords1 = getAnchorCoordinates(anchorId2, appendTo);
    			coords2 = getAnchorCoordinates(anchorId1, appendTo);
    		}
    		const midY = (coords1.y + coords2.y) / 2;
    		// Path definition with a single turn
    		pathData = `
    			M ${coords1.x} ${coords1.y} 
    			C ${coords1.x} ${coords2.y}, ${coords1.x} ${coords2.y}, ${coords2.x} ${coords2.y}
    		`;
    	}
    }
    
	// Create SVG <path> element
	const path = document.createElementNS("http://www.w3.org/2000/svg", "path");

	if (!pathData.includes("NaN")) {
        path.setAttribute("d", pathData);
    } else {
        console.warn("SVG path ignored because pathData contains NaN");
        return;
    }
    
    path.setAttribute("fill", "none");
	path.setAttribute("stroke-width", "2");
	//path.setAttribute("filter", "url(#blurEffect)"); // Use gradient
	
	// Create ball with gradient
	const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
	circle.setAttribute("class", "ball");
	circle.setAttribute("cx", coords1.x); // Ball start
	circle.setAttribute("cy", coords1.y); // Ball start
	circle.setAttribute("r", "4");
	if(isDarkTheme) circle.setAttribute("fill", "url(#gradientDark)"); // Use gradient
	else circle.setAttribute("fill", "url(#gradientLight)"); // Use gradient
	
	// Add path and circle to group
	pathContainer.appendChild(path);
	circContainer.appendChild(circle);
	
	// Animate ball along path and retrieve "reverse" function pointer
	const controls = animateBallAlongPath(anchorId1, path, circle, appendTo);
	
	// Add "reverse" pointer to map for later use
	pathControls.set(anchorId1, controls);
	
	// Add origin direction of path to map
	directionControls.set(anchorId1, direction_init);
}

/*********************************************************/
/* Function to retrieve anchor coordinates:              */
/* Receives the requested anchor                         */
/*********************************************************/
function getAnchorCoordinates(anchorId, appendTo) {
	
	const columnIndex = anchorId[0];
	const boxIndex = anchorId.substring(0, 3);
	
	const anchor = appendTo.querySelector(`#dashboard > #column-${columnIndex} > #box_${boxIndex} > #anchor_${anchorId}`);
	const container = appendTo.querySelector(`#dashboard`);
	
	if (!anchor || !container) {
		console.error("Anchor or container not found: " + anchorId);
		return null;
	}
	
	// Anchor position in document
	const anchorRect = anchor.getBoundingClientRect();
	
	// Container position in document
	const containerRect = container.getBoundingClientRect();
	
	// Calculate relative coordinates
	const relativeX = (anchorRect.left - containerRect.left + anchorRect.width / 2)*1000/containerRect.width;
	const relativeY = (anchorRect.top - containerRect.top + anchorRect.height / 2)*600/containerRect.height;
	
	//const relativeX = anchorRect.left - containerRect.left + anchorRect.width / 2;
	//const relativeY = anchorRect.top - containerRect.top + anchorRect.height / 2;
	
	return { x: parseFloat(relativeX.toFixed(2)), y: parseFloat(relativeY.toFixed(2)) };
}

/******************************************************************/
/* Function to start animation on links:                          */
/* Receives link ID in map (its origin anchor)                    */
/* necessary to retrieve base circulation direction of circle,    */
/* path for circle movement, and circle to move                   */
/******************************************************************/
function animateBallAlongPath(anchorId1, path, circle, appendTo) {
	
	let direction = directionControls.get(anchorId1);
	
	const pathLength = path.getTotalLength(); // Total path length
	
	const box = appendTo.querySelector(`#dashboard`);
	const boxWidth = box.offsetWidth;

	const speed = boxWidth/10; // Ball speed in pixels per second 100/900
	const duration = pathLength / speed * 1000; // Animation duration (in ms)
	let startTime;
	
	function reverseDirection(cmd) {
	    const directionInit = directionControls.get(anchorId1);
		direction = directionInit*cmd; // Invert direction
	}
	
	function moveBall(time) {
		if (!startTime) startTime = time;
		
		const elapsed = time - startTime; // Time elapsed
		var progress = (elapsed % duration) / duration; // Animation progress (0 to 1)
		
		if (direction == -1) {
			progress = 1 - progress; // Invert progress to go backwards
		} if (direction == 0) {
			progress = 0; 
		}
		
		// Calculate current position on path, proportional to duration
		const point = path.getPointAtLength(progress * pathLength);
		
		// Move ball
		circle.setAttribute("cx", point.x);
		circle.setAttribute("cy", point.y);
		
		// Continue animation
		requestAnimationFrame(moveBall);
	}
	
	// Start animation
	requestAnimationFrame(moveBall);
	
	// Returns "reverse" function pointer
	return {
		reverse: reverseDirection,
	};
}

/******************************************************/
/* Animation inversion function:                      */
/* Checks entity value and changes direction if       */
/* necessary                                          */
/******************************************************/
export function checkForReverse(devices, hass) {
    
    for (const boxId in devices) {
            const device = devices[boxId];
            
            // Loop through numbered links
            const links = device.link;
            
            if(links !== "nolink") {
                for (const linkId in links) {
                    
                    const link = links[linkId];
                    
                    const stateLinkEnt = hass.states[link.entity];
                    const valueLinkEnt = stateLinkEnt ? stateLinkEnt.state : '';
                    
                    const pathControl = pathControls.get(`${boxId}_${link.start}`);
                    
                    if (pathControl && typeof pathControl.reverse === "function") {
                        if(valueLinkEnt < -0.5) pathControls.get(`${boxId}_${link.start}`).reverse(-1); 
                        else if(valueLinkEnt > 0.5) pathControls.get(`${boxId}_${link.start}`).reverse(1); 
                        else pathControls.get(`${boxId}_${link.start}`).reverse(0); 
                    } 
                }
        	}
        }
}

/******************************************************/
/* Group of functions to start history retrieval      */
/* at regular intervals                               */
/******************************************************/
export async function startPeriodicTask(config, hass) {
    
    clearAllIntervals();
    
    const devices = config.devices || [];
    
    for (const boxId in devices) {
        
        const device = devices[boxId];
            
        if(device.graph) {
            
            const intervalMinutes = 15;
            
            //console.log(`Attempting to start periodic task for ${device.entity}. Interval: ${intervalMinutes} minutes.`);
            
            // Check if first execution succeeds
            const firstExecutionSuccessful = await performTask(device.entity, hass);
            
            if (!firstExecutionSuccessful) {
                console.warn(`First execution failed for ${device.entity}. Periodic task cancelled.`);
                clearAllIntervals();
                return false; // Do not start periodic task if first execution fails
            }
            
            //console.log(`First execution successful for ${device.entity}. Setting up periodic task.`);

            
            // Schedule periodic task for this entity
            const intervalId = setInterval(() => {
                performTask(device.entity, hass);
            }, intervalMinutes * 60 * 1000);
    
            // Store interval in Map
            intervals.set(device.entity, intervalId);
        }
    }
    return true;
}

export function clearAllIntervals(appendTo) {
    // Stop all running tasks
    intervals.forEach((intervalId, id) => {
        clearInterval(intervalId);
        //console.log(`Task for entity "${id}" stopped.`);
    });
    intervals.clear();
}

function performTask(entityId, hass) {
    // Function to execute periodically for each entity
    //console.log(`Periodic task in progress for entity "${entityId}"...`);
    // Here you can add data retrieval logic
    
    const historicalData = fetchHistoricalData(entityId, 24, hass); // 24h retrieval
    
    if (historicalData === "false") {
        console.warn(`Impossible to retrieve history for ${entityId}.`);
        return false; // Returns "false" if history could not be retrieved
    }

    //console.log(`Periodic task successful for ${entityId}.`);
    return true; // Returns "true" if everything went well
}

async function fetchHistoricalData(entityId, periodInHours = 24, hass, numSegments = 6) {
    const now = new Date();
    const startTime = new Date(now.getTime() - periodInHours * 60 * 60 * 1000); // Specified period

    if (!hass || !hass.states || !hass.states[entityId]) {
        console.error(`hass or entity ${entityId} not yet available.`);
        return false;
    }

    // URL for Home Assistant API
    const url = `history/period/${startTime.toISOString()}?filter_entity_id=${entityId}&minimal_response=true&significant_changes_only=true`;

    try {
        const response = await hass.callApi('GET', url);

        if (response.length === 0 || response[0].length === 0) {
            console.log(`No data available for "${entityId}" in the ${periodInHours} hour(s) period.`);
            return false;
        }

        const rawData = response[0];

        // Step 1: Transform data into usable format
        const formattedData = rawData
            .map((item) => ({
                time: new Date(item.last_changed),
                state: parseFloat(item.state), // Conversion to number
            }))
            .filter((item) => !isNaN(item.state)); // Filter invalid data

        if (formattedData.length === 0) {
            console.log(`No valid formatted data for "${entityId}".`);
            return false;
        }

        // Step 2: Reduce data into segments while maintaining constant Y scale
        const interval = 30 * 60 * 1000; // 15 minutes in milliseconds
                const totalIntervals = (periodInHours * 60 * 60 * 1000) / interval; // Calculation of number of intervals for given period
                const startTimestamp = Math.floor(startTime.getTime() / interval) * interval;
            
                const reducedData = [];
                for (let i = 0; i < totalIntervals; i++) {
                    const targetTime = new Date(startTimestamp + i * interval);
                    const closest = formattedData.reduce((prev, curr) => {
                        return Math.abs(curr.time - targetTime) < Math.abs(prev.time - targetTime) ? curr : prev;
                    });
                    reducedData.push({ time: targetTime, value: closest.state });
                }
        
        // Step 2bis: Add min and max points to reducedData array
        const segmentSize = Math.ceil(formattedData.length / numSegments);
        for (let i = 0; i < formattedData.length; i += segmentSize) {
            const segment = formattedData.slice(i, i + segmentSize);
        
            let minPoint = { value: Infinity, time: null };
            let maxPoint = { value: -Infinity, time: null };
        
            segment.forEach((point) => {
                if (point.state < minPoint.value) minPoint = { value: point.state, time: point.time };
                if (point.state > maxPoint.value) maxPoint = { value: point.state, time: point.time };
            });
        
            // Add min and max to reduced array
            reducedData.push({ time: minPoint.time, value: minPoint.value });
            reducedData.push({ time: maxPoint.time, value: maxPoint.value });
        }

        // Step 3: Sort chronologically
        reducedData.sort((a, b) => a.time - b.time);
        
        //console.log(reducedData);

        // Step 4: Store reduced data
        historicData.set(
            entityId,
            reducedData.map((point) => ({
                time: point.time,
                value: point.value,
            }))
        );
        
        updateGraphTriggers.set(entityId, true);

        return true;
    } catch (error) {
        console.error('Error retrieving history:', error);
        return false;
    }
}





export const getEntityNames = (entities) => {
  return entities?.split("|").map((p) => p.trim());
};

export const getFirstEntityName = (entities) => {
  const names = getEntityNames(entities);
  return names.length > 0 ? names[0] : "";
};


export function getDefaultConfig(hass) {
      
    const powerEntities = Object.keys(hass.states).filter((entityId) => {
        const stateObj = hass.states[getFirstEntityName(entityId)];
        const isAvailable =
          (stateObj.state && stateObj.attributes && stateObj.attributes.device_class === "power") || stateObj.entity_id.includes("power");
        return isAvailable;
    });
  
    function checkStrings(entiyId, testStrings) {
        const firstId = getFirstEntityName(entiyId);
        const friendlyName = hass.states[firstId].attributes.friendly_name;
        return testStrings.some((str) => firstId.includes(str) || friendlyName?.includes(str));
    }
  
    const gridPowerTestString = ["grid", "utility", "net", "meter"];
    const solarTests = ["solar", "pv", "photovoltaic", "inverter"];
    const batteryTests = ["battery"];
    const batteryPercentTests = ["battery_percent", "battery_level", "state_of_charge", "soc", "percentage"];
    const firstGridPowerEntity = powerEntities.filter((entityId) => checkStrings(entityId, gridPowerTestString))[0];
    const firstSolarPowerEntity = powerEntities.filter((entityId) => checkStrings(entityId, solarTests))[0];
    
    const currentEntities = Object.keys(hass.states).filter((entityId) => {
        const stateObj = hass.states[entityId];
        const isAvailable = stateObj && stateObj.state && stateObj.attributes && stateObj.attributes.unit_of_measurement === "A";
        return isAvailable;
    });
    const percentageEntities = Object.keys(hass.states).filter((entityId) => {
        const stateObj = hass.states[entityId];
        const isAvailable = stateObj && stateObj.state && stateObj.attributes && stateObj.attributes.unit_of_measurement === "%";
        return isAvailable;
    });
    const firstBatteryPercentageEntity = percentageEntities.filter((entityId) => checkStrings(entityId, batteryPercentTests))[0];
    
    const firstCurrentEntity = currentEntities.filter((entityId) => checkStrings(entityId, batteryTests))[0];
  
    return {
        param: {
            boxCol1: 2,
            boxCol3: 2,
        },
        theme: "dark",
        styles: {
            header: 10,
            sensor: 16,
        },
        devices: {
            "1-1": {
                icon: "mdi:transmission-tower",
                name: "Grid",
                entity: firstGridPowerEntity ?? "",
                anchors: "R-1",
                link: {
                    "1":{
                        start: "R-1",
                        end: "2-1_L-1",
                    },
                },
            },
            "1-2": {
                icon: "mdi:battery-charging",
                name: "Battery",
                entity: firstBatteryPercentageEntity ?? "",
                anchors: "R-1",
                gauge: "true",
                link: {
                    "1":{
                        start: "R-1",
                        end: "2-1_B-1",
                        entity: firstCurrentEntity ?? "",
                    },
                },
            },
            "2-1": {
                icon: "mdi:cellphone-charging",
                name: "Multiplus",
                anchors: "L-1, B-2, R-1",
            },
            "3-1": {
                icon: "mdi:home-lightning-bolt",
                name: "Home",
                entity: firstGridPowerEntity ?? "",
                anchors: "L-1",
                link: {
                    "1":{
                        start: "L-1",
                        end: "2-1_R-1",
                    },
                },
            },
            "3-2": {
                icon: "mdi:weather-sunny",
                name: "Solar",
                entity: firstSolarPowerEntity ?? "",
                anchors: "L-1",
                link: {
                    "1":{
                        start: "L-1",
                        end: "2-1_B-2",
                        entity: firstSolarPowerEntity ?? "",
                        inv: "true",
                    },
                },
            },
        },
    }
}
