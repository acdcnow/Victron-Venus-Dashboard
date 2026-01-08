/**********************************************/
/* Variable to list expanded panels           */
/**********************************************/
let expandedPanelsState = new Set();

/**********************************************/
/* Variable to list events on objects         */
/**********************************************/
export const eventHandlers = new WeakMap();

/**************************************/
/* Functions for graphic editor       */
/* translation                        */
/**************************************/
let translations = {}; 

export async function loadTranslations(appendTo) {
    const lang = appendTo._hass?.language || "en"; 
    try {
        const response = await import(`./lang-${lang}.js`);
        translations = response.default;
    } catch (error) {
        console.error("Language load error:", error);
        const response = await import(`./lang-en.js`);
        translations = {};
    }
}

export function t(func, key) {
    return translations?.[func]?.[key] || `⚠️ ${func}.${key} ⚠️`; 
}

/***************************************/
/* Main tab rendering function:        */
/***************************************/
export function tab1Render(appendTo) {
    
    const tabContent = appendTo.shadowRoot.querySelector('#tab-content');
    tabContent.innerHTML = '';
    
    const editorDiv = document.createElement('div');
    editorDiv.classList.add('editor');
    
    // Theme choice
    const themeRow = document.createElement('div');
    themeRow.classList.add('col');
    const themeLabel = document.createElement('div');
    themeLabel.classList.add('left');
    themeLabel.textContent = t("tab1Render", "theme_choice");
    const radioGroup = document.createElement('div');
    radioGroup.classList.add('radio-group', 'row');
    const themeOptions = [
      { label: t("tab1Render", "light"), value: 'light' }, 
      { label: t("tab1Render", "dark"), value: 'dark' }, 
      { label: t("tab1Render", "auto"), value: 'auto' }, 
    ];
    
    const defaultTheme = appendTo._config.theme || 'auto';
    
    themeOptions.forEach(option => {
      const formfield = document.createElement('ha-formfield');
      formfield.setAttribute('label', option.label);
      formfield.classList.add('cell');
      const radio = document.createElement('ha-radio');
      radio.setAttribute('name', 'themeSelect');
      radio.setAttribute('data-path', 'theme');
      radio.setAttribute('value', option.value);
      if (defaultTheme  === option.value) radio.setAttribute('checked', '');
      formfield.appendChild(radio);
      radioGroup.appendChild(formfield);
    });
    
    themeRow.appendChild(themeLabel);
    themeRow.appendChild(radioGroup);
    editorDiv.appendChild(themeRow);
    
    // Number of "Devices" per column
    const devicesRow = document.createElement('div');
    devicesRow.classList.add('col');
    const devicesLabel = document.createElement('div');
    devicesLabel.classList.add('left');
    devicesLabel.textContent = t("tab1Render", "devices_per_column");
    
    const devicesInputs = [
      { id: 'boxCol1', label: 'col. 1', value: appendTo._config.param?.boxCol1 ?? 1, min: 1, max: 4, step: 1 },
      { id: 'boxCol2', label: 'col. 2', value: appendTo._config.param?.boxCol2 ?? 1, min: 1, max: 2, step: 1 },
      { id: 'boxCol3', label: 'col. 3', value: appendTo._config.param?.boxCol3 ?? 1, min: 1, max: 4, step: 1 },
    ];
    
    const devicesRowContainer = document.createElement('div');
    devicesRowContainer.classList.add('row');
    devicesInputs.forEach(input => {
      const textfield = document.createElement('ha-textfield');
      textfield.classList.add('cell');
      textfield.setAttribute('id', input.id);
      textfield.setAttribute('data-path', `param.${input.id}`);
      textfield.setAttribute('label', input.label);
      textfield.setAttribute('value', input.value);
      textfield.setAttribute('type', 'number');
      textfield.setAttribute('min', input.min);
      textfield.setAttribute('max', input.max);
      textfield.setAttribute('step', input.step);
      devicesRowContainer.appendChild(textfield);
    });
    devicesRow.appendChild(devicesLabel);
    devicesRow.appendChild(devicesRowContainer);
    editorDiv.appendChild(devicesRow);
    
    // Font size in "Devices" zones
    const fontSizeRow = document.createElement('div');
    fontSizeRow.classList.add('col');
    const fontSizeLabel = document.createElement('div');
    fontSizeLabel.classList.add('row');
    fontSizeLabel.textContent = t("tab1Render", "font_size_zones");
    fontSizeRow.appendChild(fontSizeLabel);
    
    const fontSizeSections = [
      { label: t("tab1Render", "in_header"), path: 'header', id: 'header' }, 
      { label: t("tab1Render", "in_devices"), path: 'sensor', id: 'sensor' }, 
      { label: t("tab1Render", "in_footer"), path: 'footer', id: 'footer' }, 
    ];
    
    fontSizeSections.forEach(section => {
      const sectionRow = document.createElement('div');
      sectionRow.classList.add('row');
    
      const labelCell = document.createElement('div');
      labelCell.classList.add('row', 'cellx1-5');
      const labelText = document.createElement('div');
      labelText.classList.add('cell', 'left');
      labelText.textContent = `- ${section.label}`;
      labelCell.appendChild(labelText);
      sectionRow.appendChild(labelCell);
    
      const inputCell = document.createElement('div');
      inputCell.classList.add('cell', 'right');
      const textfield = document.createElement('ha-textfield');
      textfield.setAttribute('id', section.id);
      textfield.setAttribute('data-path', `styles.${section.path}`);
      textfield.setAttribute('data-group', section.path);
      textfield.setAttribute('label', t("tab1Render", "font_size"));
      textfield.setAttribute('type', 'number');
      textfield.setAttribute('min', 1);
      textfield.setAttribute('step', 1);
    
      if (appendTo._config.styles && appendTo._config.styles[section.path]) {
        if (appendTo._config.styles[section.path] === 'auto') {
          textfield.setAttribute('disabled', '');
        } else {
          textfield.setAttribute('value', appendTo._config.styles[section.path]);
        }
      }
      
      inputCell.appendChild(textfield);
      sectionRow.appendChild(inputCell);
    
      const switchCell = document.createElement('div');
      switchCell.classList.add('row', 'cell');
      const switchContainer = document.createElement('div');
      switchContainer.classList.add('cell', 'right');
      const fontSwitch = document.createElement('ha-switch');
      fontSwitch.setAttribute('data-path', `styles.${section.path}`);
      fontSwitch.setAttribute('data-group', section.path);
    
      if (appendTo._config.styles && appendTo._config.styles[section.path] === 'auto') {
        fontSwitch.setAttribute('checked', '');
      }
    
      switchContainer.appendChild(fontSwitch);
      switchCell.appendChild(switchContainer);
      sectionRow.appendChild(switchCell);
    
      fontSizeRow.appendChild(sectionRow);
    });
    
    editorDiv.appendChild(fontSizeRow);
    
    tabContent.appendChild(editorDiv);

}

/**********************************************/
/* Col tab content rendering function:        */
/**********************************************/
export function tabColRender(col, appendTo) {
    
    const boxCol = appendTo._config.param[`boxCol${col}`] ?? 1;
    
    const tabContent = appendTo.shadowRoot.querySelector('#tab-content');
    tabContent.innerHTML = '';

    let tabsHTML = ''; 
    for (let i = 1; i <= boxCol; i++) {
        // Manually managing active attribute for sub-tabs
        const isActive = (i - 1) === appendTo._currentSubTab ? 'active' : '';
        tabsHTML += `<sl-tab slot="nav" panel="anchor" label="1-${i}" data-tab="${i - 1}" ${isActive}>${col}-${i}</sl-tab>`;
    }
            
    tabContent.innerHTML = `
        <div class="devices-editor">
            <sl-tab-group id="subTab-group">
                ${tabsHTML}
            </sl-tab-group>
        
            <sl-tab-panel id="sl-subTab-content" name="anchor" active>
              <div id="subTab-content" class="subTab-content">
                </div>
            </sl-tab-panel>
        </div>
    `;
            
    attachSubLinkClick(appendTo);
    renderSubTabContent(col, appendTo);
}

/************************************************/
/* Function calling the sub-tab rendering       */
/************************************************/
export function renderSubTabContent(col, appendTo) {
    const subTabContent = appendTo.shadowRoot.querySelector('#subTab-content');
    const boxId = `${col}-${appendTo._currentSubTab+1}`;
    subtabRender(boxId, appendTo._config, appendTo._hass, appendTo);
    attachInputs(appendTo); 
}

/************************************************/
/* Sub-tab content rendering function:          */
/************************************************/
export function subtabRender(box, config, hass, appendTo) {
    
    const subTabContent = appendTo.shadowRoot.querySelector('#subTab-content');
    
    let leftQty = 0, topQty = 0, bottomQty = 0, rightQty = 0;
    
    const anchors = config?.devices?.[box]?.anchors ? config?.devices?.[box]?.anchors.split(', ') : [];
    
    let thisAllAnchors = [];

    anchors.forEach((anchor) => {
        const [side, qtyStr] = anchor.split('-'); 
        const qty = parseInt(qtyStr, 10); 
    
        if (side === 'L') leftQty += qty;
        else if (side === 'T') topQty += qty;
        else if (side === 'B') bottomQty += qty;
        else if (side === 'R') rightQty += qty;
        
        for (let i = 1; i <= qty; i++) {
            thisAllAnchors.push(`${side}-${i}`);
        }
    });
    
    thisAllAnchors.sort();
    
    const OtherAllAnchors = getAllAnchorsExceptCurrent(config, box);
    
    subTabContent.innerHTML = `
        
        <ha-expansion-panel expanded outlined id="subPanel_header" header="${t("subtabRender", "header_title")}">
            <div class="col inner">
                <div class="row">
                    <ha-icon-picker
                        class="cell"
                        label="${t("subtabRender", "icon_choice")}"
                        id="device_icon"
                        data-path="devices.${box}.icon"
                    >
                    </ha-icon-picker>
                    <ha-textfield 
                        class="cell"
                        label="${t("subtabRender", "name_choice")}"
                        id="device_name"
                        data-path="devices.${box}.name"
                    ></ha-textfield>
                </div>
            </div>
        </ha-expansion-panel>
        
        <ha-expansion-panel outlined id="subPanel_entities" header="${t("subtabRender", "sensor_title")}">
            <div class="col inner">
                <ha-entity-picker
                    label="${t("subtabRender", "entity_choice")}"
                    id="device_sensor"
                    data-path="devices.${box}.entity"
                >
                </ha-entity-picker>
                <ha-entity-picker
                    label="${t("subtabRender", "entity2_choice")}"
                    id="device_sensor2"
                    data-path="devices.${box}.entity2"
                >
                </ha-entity-picker>

                <ha-textfield
                    class="cell"
                    label="${t("subtabRender", "decimals_choice")}"
                    type="number"
                    min="0"
                    max="5"
                    data-path="devices.${box}.decimals"
                    id="device_decimals"
                ></ha-textfield>
    
                <div class="row">
                    <div class="row cell">
                        ${t("subtabRender", "enable_graph")} :
                        <ha-switch class="cell right" 
                            id="graph_switch"
                            data-path="devices.${box}.graph" 
                        ></ha-switch>
                    </div>
                    <div id="gauge_div" class="row cell">
                        ${t("subtabRender", "enable_gauge")} :
                        <ha-switch class="cell right"
                            id="gauge_switch"
                            data-path="devices.${box}.gauge" 
                        ></ha-switch>
                    </div>
                </div>
            </div>
        </ha-expansion-panel>
        
        <ha-expansion-panel outlined id="subPanel_entities2" header="${t("subtabRender", "header_footer_title")}">
            <div class="col inner">
                <ha-entity-picker
                    class="stacked-picker"
                    label="${t("subtabRender", "entity_header")}"
                    id="header_sensor"
                    data-path="devices.${box}.headerEntity"
                >
                </ha-entity-picker>
                <ha-entity-picker
                    class="stacked-picker"
                    label="${t("subtabRender", "entity_footer")}"
                    id="footer1_sensor"
                    data-path="devices.${box}.footerEntity1"
                >
                </ha-entity-picker>
                <ha-entity-picker
                    class="stacked-picker"
                    label="${t("subtabRender", "entity2_footer")}"
                    id="footer2_sensor"
                    data-path="devices.${box}.footerEntity2"
                >
                </ha-entity-picker>
                <ha-entity-picker
                    class="stacked-picker"
                    label="${t("subtabRender", "entity3_footer")}"
                    id="footer3_sensor"
                    data-path="devices.${box}.footerEntity3"
                >
                </ha-entity-picker>
            </div>
        </ha-expansion-panel>
        
        <ha-expansion-panel outlined id="subPanel_anchors" header="${t("subtabRender", "anchor_title")}">
            <div class="col inner">
                <div class="row">
                    <div class="col cell">
                        <ha-textfield class="anchor cell"
                            id="anchor_left"
                            data-path="devices.${box}.anchors" 
                            label="${t("subtabRender", "left_qtyBox")}"
                            value=""
                            type="number"
                            min="0"
                            max="3"
                            step="1"
                        ></ha-textfield>
                    </div>
                    <div class="col cell">
                        <ha-textfield class="anchor cell"
                            id="anchor_top"
                            data-path="devices.${box}.anchors" 
                            label="${t("subtabRender", "top_qtyBox")}"
                            value=""
                            type="number"
                            min="0"
                            max="3"
                            step="1"
                        ></ha-textfield>
                        <ha-textfield class="anchor cell"
                            id="anchor_bottom"
                            data-path="devices.${box}.anchors" 
                            label="${t("subtabRender", "bottom_qtyBox")}"
                            value=""
                            type="number"
                            min="0"
                            max="3"
                            step="1"
                        ></ha-textfield>
                    </div>
                    <div class="col cell">
                        <ha-textfield class="anchor cell"
                            id="anchor_right"
                            data-path="devices.${box}.anchors" 
                            label="${t("subtabRender", "right_qtyBox")}"
                            value=""
                            type="number"
                            min="0"
                            max="3"
                            step="1"
                        ></ha-textfield>
                    </div>
                </div>
            </div>
        </ha-expansion-panel>
        
        <div class="contMenu">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div class="headerMenu">${t("subtabRender", "add_links")}</div>
                <ha-icon-button id="add-link-button" aria-label="${t("subtabRender", "add_link")}">
                    <ha-icon icon="mdi:plus" style="display: flex;"></ha-icon>
                </ha-icon-button>
            </div>
            <div id="link-container" class="col noGap"></div>
        </div>
    `;
    
    expandedPanelsState.forEach(id => {
        const panel = subTabContent.querySelector(`ha-expansion-panel#${id}`);
        if (panel) {
            panel.setAttribute("expanded", "");
        }
    });
            
    const iconPicker = subTabContent.querySelector('#device_icon');
    const nameField = subTabContent.querySelector('#device_name');
    const entityPicker = subTabContent.querySelector('#device_sensor');
    const entity2Picker = subTabContent.querySelector('#device_sensor2');
    const decimalsField = subTabContent.querySelector('#device_decimals');
    const graphSwitch = subTabContent.querySelector('#graph_switch');
    const gaugeSwitch = subTabContent.querySelector('#gauge_switch');
    const headerEntity = subTabContent.querySelector('#header_sensor');
    const footerEntity1 = subTabContent.querySelector('#footer1_sensor');
    const footerEntity2 = subTabContent.querySelector('#footer2_sensor');
    const footerEntity3 = subTabContent.querySelector('#footer3_sensor');
    const anchorLeft = subTabContent.querySelector('#anchor_left');
	const anchorTop = subTabContent.querySelector('#anchor_top');
	const anchorbottom = subTabContent.querySelector('#anchor_bottom');
	const anchorRight = subTabContent.querySelector('#anchor_right');
	
	anchorLeft.value = leftQty;
    anchorTop.value = topQty;
    anchorbottom.value = bottomQty;
    anchorRight.value = rightQty;
    
    nameField.value = config?.devices?.[box]?.name ?? "";
    iconPicker.value = config?.devices?.[box]?.icon ?? ""; 
    entityPicker.value = config?.devices?.[box]?.entity ?? "";
    entity2Picker.value = config?.devices?.[box]?.entity2 ?? "";
    decimalsField.value = config?.devices?.[box]?.decimals ?? "";
    headerEntity.value = config?.devices?.[box]?.headerEntity ?? "";
    footerEntity1.value = config?.devices?.[box]?.footerEntity1 ?? "";
    footerEntity2.value = config?.devices?.[box]?.footerEntity2 ?? "";
    footerEntity3.value = config?.devices?.[box]?.footerEntity3 ?? "";
    
    iconPicker.hass = hass; 
    entityPicker.hass = hass; 
    entity2Picker.hass = hass; 
    headerEntity.hass = hass; 
    footerEntity1.hass = hass; 
    footerEntity2.hass = hass; 
    footerEntity3.hass = hass; 
           
    if (config?.devices?.[box]?.graph === true) graphSwitch.setAttribute('checked', '');
    
    const entity = hass.states?.[entityPicker.value];
    const unit = entity?.attributes?.unit_of_measurement;

    if(unit !== '%' ) {
        gaugeSwitch.setAttribute('disabled', '');
        gaugeSwitch.setAttribute("title", t("subtabRender", "warning_gauge"));
    } else if (config.devices?.[box]?.gauge === true) gaugeSwitch.setAttribute('checked', '');
    
    
    const linkContainer = subTabContent.querySelector('#link-container');
    const addLinkButton = subTabContent.querySelector('#add-link-button');
    
    Object.entries(config.devices?.[box]?.link || {}).forEach(([linkKey, link]) => {
        addLink(linkKey, box, hass, thisAllAnchors, OtherAllAnchors, appendTo);
    });
    
    addLinkButton.addEventListener('click', (e) => {
        addLink(linkContainer.children.length+1, box, hass, thisAllAnchors, OtherAllAnchors, appendTo);
    });
    
    function trackExpansionState() {
    subTabContent.querySelectorAll("ha-expansion-panel").forEach(panel => {
            panel.addEventListener("expanded-changed", (event) => {
                if (event.detail.expanded) {
                    expandedPanelsState.add(panel.id); 
                } else {
                    expandedPanelsState.delete(panel.id); 
                }
            });
        });
    }
    
    trackExpansionState();
}

export function getAllAnchorsExceptCurrent(config, currentBox) {
    let allAnchors = [];

    Object.entries(config.devices || {}).forEach(([boxKey, device]) => {
        if (boxKey === currentBox || !device.anchors) return; 

        const anchors = device.anchors.split(', ');

        anchors.forEach((anchor) => {
            const [side, qtyStr] = anchor.split('-'); 
            const qty = parseInt(qtyStr, 10);

            for (let i = 1; i <= qty; i++) {
                allAnchors.push(`${boxKey}_${side}-${i}`); 
            }
        });
    });

    allAnchors.sort();
    return allAnchors;
}

export function addLink(index, box, hass, thisAllAnchors, OtherAllAnchors, appendTo) {
    
    const subTabContent = appendTo.shadowRoot.querySelector('#subTab-content');
    const linkContainer = subTabContent.querySelector('#link-container');
    
    const panel = document.createElement('ha-expansion-panel');
    panel.setAttribute('outlined', '');
    panel.setAttribute('expanded', '');
    panel.setAttribute('style', 'margin: 0px 0px 8px 0px');
        
    panel.innerHTML = `
        <div slot="header" style="display: flex; justify-content: space-between; align-items: center;">
            <span>Link ${index}</span>
            <ha-icon-button id="add-link-button" aria-label="Add a link">
                <ha-icon icon="mdi:trash-can" style="display: flex;"></ha-icon>
            </ha-icon-button>
        </div>
        <div id="link-container" class="inner">
            <div class="col">
                <div class="row">
                    <ha-combo-box class="cell" 
                        label="${t("addLink", "start")}" 
                        id="start_link_${index}"
                        data-path="devices.${box}.link.${index}.start" 
                    ></ha-combo-box>
                    
                    <ha-combo-box class="cell" 
                        label="${t("addLink", "end")}" 
                        id="end_link_${index}"
                        data-path="devices.${box}.link.${index}.end" 
                    ></ha-combo-box>
                </div>
                
                <div class="row">
                    <ha-entity-picker class="cell"
                        label="${t("addLink", "entity_picker")}"
                        id="entity_link_${index}"
                        data-path="devices.${box}.link.${index}.entity" 
                    >
                    </ha-entity-picker>
                    
                    <div class="row cell">
                        ${t("addLink", "reverse")} :
                        <ha-switch class="cell right" 
                            id="inv_link_${index}"
                            data-path="devices.${box}.link.${index}.inv" 
                        ></ha-switch>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    const startLink = panel.querySelector(`#start_link_${index}`);
    startLink.items = thisAllAnchors.map(anchor => ({ label: anchor, value: anchor })); 
    startLink.value = appendTo._config.devices?.[box]?.link?.[index]?.start ?? "";
    
    const endLink = panel.querySelector(`#end_link_${index}`);
    endLink.items = OtherAllAnchors.map(anchor => ({ label: anchor, value: anchor }));
    endLink.value = appendTo._config.devices?.[box]?.link?.[index]?.end ?? "";
    
    const entityLink = panel.querySelector(`#entity_link_${index}`);
    entityLink.hass = hass;
    entityLink.value = appendTo._config.devices[box]?.link?.[index]?.entity ?? "";
    
    const invLink = panel.querySelector(`#inv_link_${index}`);
    if (appendTo._config.devices[box]?.link?.[index]?.inv === true) invLink.setAttribute('checked', '');
    
    const path = `devices.${box}.link.${index}`;
        
    const deleteButton = panel.querySelector('ha-icon-button');
    deleteButton.addEventListener('click', () => {
        appendTo._config = updateConfigRecursively(appendTo._config, path, null, true);
        notifyConfigChange(appendTo);
        
        panel.remove();
    });
    
    linkContainer.appendChild(panel);
    
    attachLinkInputs(appendTo)
        
}

export function attachLinkInputs(appendTo) {
        
    appendTo.shadowRoot.querySelectorAll('ha-combo-box').forEach((comboBox) => {
        if (eventHandlers.has(comboBox)) return; 
        
        const handleChange = (e) => {
            const key = comboBox.dataset.path;
            let value = e.detail.value;
            
            if (!value) value = null; 
            
            if (key) {
                appendTo._config = updateConfigRecursively(appendTo._config, key, value, true);
                notifyConfigChange(appendTo);
            }
            
            const event = new CustomEvent('config-changed', {
                detail: { redrawRequired: true }
            });
            document.dispatchEvent(event);

        };
        
        comboBox.addEventListener("value-changed", handleChange);
        eventHandlers.set(comboBox, handleChange);
    });
    
    appendTo.shadowRoot.querySelectorAll('ha-textfield').forEach((textField) => {
        if (eventHandlers.has(textField)) return; 
        
        const handleChange = (e) => {
            const key = textField.dataset.path;
            let value = e.target.value;
    
            if (e.target.type === 'number') {
                if (!value || isNaN(parseInt(value, 10))) {
                    value = null; 
                } else {
                    value = parseInt(value, 10); 
                }
            } else {
                value = value.trim(); 
                if (value === "") value = null; 
            }
        
            if (key) {
                appendTo._config = updateConfigRecursively(appendTo._config, key, value, true);
                notifyConfigChange(appendTo);
            }
            
            const event = new CustomEvent('config-changed', {
                detail: { redrawRequired: true }
            });
            document.dispatchEvent(event);
        };
        
        textField.addEventListener("change", handleChange);
        eventHandlers.set(textField, handleChange);
    });
    
    appendTo.shadowRoot.querySelectorAll('ha-switch').forEach((toggle) => {
        if (eventHandlers.has(toggle)) return; 
        
        const handleChange = (e) => {
            const key = toggle.dataset.path;
            const value = e.target.checked ? true : null; 
            
            if (key) {
                appendTo._config = updateConfigRecursively(appendTo._config, key, value, true); 
                notifyConfigChange(appendTo);
            }
            
            const event = new CustomEvent('config-changed', {
                detail: { redrawRequired: true }
            });
            document.dispatchEvent(event);
        };
        
        toggle.addEventListener("change", handleChange);
        eventHandlers.set(toggle, handleChange);
    });
}

/************************************************/
/* Function creating events attached to         */
/* different interface inputs then sort and     */
/* send for yaml update                         */
/************************************************/
export function attachInputs(appendTo) {
        
    appendTo.shadowRoot.querySelectorAll('ha-textfield:not(.anchor)').forEach((textField) => {
        if (eventHandlers.has(textField)) return; 
        
        const handleChange = (e) => {
            const key = textField.dataset.path;
            let value = e.target.value;
    
            if (e.target.type === 'number') {
                if (!value || isNaN(parseInt(value, 10))) {
                    value = null; 
                } else {
                    value = parseInt(value, 10); 
                }
            } else {
                value = value.trim(); 
                if (value === "") value = null; 
            }
        
            if (key) {
                appendTo._config = updateConfigRecursively(appendTo._config, key, value, true);
                notifyConfigChange(appendTo);
            }
        };
        
        textField.addEventListener("change", handleChange);
        eventHandlers.set(textField, handleChange);
    });

    appendTo.shadowRoot.querySelectorAll('ha-textfield.anchor').forEach((textField) => {
        if (eventHandlers.has(textField)) return; 
        
        const handleChange = (e) => {
            const key = textField.dataset.path;
    
            const anchorLeft = appendTo.shadowRoot.querySelector('#anchor_left').value;
            const anchorTop = appendTo.shadowRoot.querySelector('#anchor_top').value;
            const anchorBottom = appendTo.shadowRoot.querySelector('#anchor_bottom').value;
            const anchorRight = appendTo.shadowRoot.querySelector('#anchor_right').value;
            
            let anchors = [];
            
            if (anchorLeft && anchorLeft !== "0") anchors.push(`L-${anchorLeft}`);
            if (anchorTop && anchorTop !== "0") anchors.push(`T-${anchorTop}`);
            if (anchorBottom && anchorBottom !== "0") anchors.push(`B-${anchorBottom}`);
            if (anchorRight && anchorRight !== "0") anchors.push(`R-${anchorRight}`);
        
            if (anchors.length > 0) {
                const strAnchors = anchors.join(', ');
                appendTo._config = updateConfigRecursively(appendTo._config, key, strAnchors, true);
                notifyConfigChange(appendTo);
            } else {
                appendTo._config = updateConfigRecursively(appendTo._config, key, null, true);
                notifyConfigChange(appendTo);
            }
        };
        
        textField.addEventListener("change", handleChange);
        eventHandlers.set(textField, handleChange);
    });
 
    appendTo.shadowRoot.querySelectorAll('ha-switch').forEach((toggle) => {
        if (eventHandlers.has(toggle)) return; 
        
        const handleChange = (e) => {
            const key = toggle.dataset.path;
            const value = e.target.checked ? true : null; 
            const group = toggle.dataset.group;
            const isChecked = e.target.checked;
            
            if (group) {
                const textField = appendTo.shadowRoot.querySelector(`ha-textfield[data-group="${group}"]`);
                const key2 = textField.dataset.path;
        
                if (isChecked) {
                  appendTo._config = updateConfigRecursively(appendTo._config, key2, "auto"); 
                } else {
                    const value = textField.value && !isNaN(parseInt(textField.value, 10)) 
                    ? parseInt(textField.value, 10) 
                    : null;
                    appendTo._config = updateConfigRecursively(appendTo._config, key2, value, true);
                }
                notifyConfigChange(appendTo);
            } else {
                if (key) {
                    appendTo._config = updateConfigRecursively(appendTo._config, key, value, true); 
                    notifyConfigChange(appendTo);
                }
            }
        };
        
        toggle.addEventListener("change", handleChange);
        eventHandlers.set(toggle, handleChange);
    });
    
    appendTo.shadowRoot.querySelectorAll('ha-radio').forEach((radio) => {
        if (eventHandlers.has(radio)) return; 
        
        const handleChange = (e) => {
            const key = radio.dataset.path; 
            const value = e.target.value; 
            if (key) {
                appendTo._config = updateConfigRecursively(appendTo._config, key, value, true);
                notifyConfigChange(appendTo);
            }
        };
        radio.addEventListener("change", handleChange);
        eventHandlers.set(radio, handleChange);
    });
          
    appendTo.shadowRoot.querySelectorAll('ha-icon-picker').forEach((iconPicker) => {
        if (eventHandlers.has(iconPicker)) return; 
        
        const handleChange = (e) => {
            const key = iconPicker.dataset.path; 
            let value = e.detail.value;
            if (value === "") value = null; 
            
            if (key) {
                appendTo._config = updateConfigRecursively(appendTo._config, key, value, true);
                notifyConfigChange(appendTo);
            }
        }
        iconPicker.addEventListener("value-changed", handleChange);
        eventHandlers.set(iconPicker, handleChange);
    });
    
    appendTo.shadowRoot.querySelectorAll('ha-entity-picker').forEach((entityPicker) => {
        if (eventHandlers.has(entityPicker)) return; 
            
        const handleChange = (e) => {
            const key = entityPicker.dataset.path; 
            let value = e.detail.value;
            if (!value || value.trim() === "") value = null; 
            
            if (key) {
                appendTo._config = updateConfigRecursively(appendTo._config, key, value, true);
                notifyConfigChange(appendTo);
            }
        }
        entityPicker.addEventListener("value-changed", handleChange);
        eventHandlers.set(entityPicker, handleChange);
    });
}

/**********************************************/
/* Function to modify yaml config             */
/**********************************************/
export function updateConfigRecursively(obj, path, value, removeIfNull = false) {
    const cloneObject = (o) => {
        return Array.isArray(o)
            ? o.map(cloneObject)
            : o && typeof o === "object"
            ? { ...o }
            : o;
    };

    const keys = path.split('.');
    let clonedObj = cloneObject(obj);
    let current = clonedObj;

    for (let i = 0; i < keys.length; i++) {
        const key = keys[i];

        if (i === keys.length - 1) {
            if (value === null && removeIfNull) {
                delete current[key]; 
            } else {
                current[key] = value; 
            }
            break;
        }

        if (!current[key]) {
            current[key] = {};
        }

        current[key] = cloneObject(current[key]);
        current = current[key];
    }

    const removeEmptyKeys = (obj) => {
        for (const key in obj) {
            if (obj[key] && typeof obj[key] === 'object') {
                if (Object.keys(obj[key]).length === 0) {
                    delete obj[key];
                } else {
                    removeEmptyKeys(obj[key]);
                }
            }
        }
    };

    removeEmptyKeys(clonedObj);
    return clonedObj;
}

/***********************************/
/* Yaml update function            */
/***********************************/
export function notifyConfigChange(appendTo) {
    const event = new Event('config-changed', {
        bubbles: true,
        composed: true,
    });
    event.detail = { config: appendTo._config };
    appendTo.dispatchEvent(event);
}

/********************************/
/* Click management function    */
/********************************/
export function attachLinkClick(renderTabContent, appendTo) {
    appendTo.shadowRoot.querySelectorAll('#tab-group sl-tab').forEach((link) => {
        if (eventHandlers.has(link)) return;

        const handleClick = (e) => {
            const tab = parseInt(e.currentTarget.getAttribute('data-tab'), 10);
            appendTo._currentTab = tab;
            appendTo._currentSubTab = 0;
            renderTabContent(appendTo); 
        };

        link.addEventListener("click", handleClick);
        eventHandlers.set(link, handleClick);
    });
}

/********************************/
/* Click management function    */
/********************************/
export function attachSubLinkClick(appendTo) {
    appendTo.shadowRoot.querySelectorAll('#subTab-group sl-tab').forEach((sublink) => {
        if (eventHandlers.has(sublink)) return;

        const handleClick = (e) => {
            const tab = parseInt(e.currentTarget.getAttribute('data-tab'), 10);
            appendTo._currentSubTab = tab;
            renderSubTabContent(appendTo._currentTab, appendTo);
        };

        sublink.addEventListener("click", handleClick);
        eventHandlers.set(sublink, handleClick);
    });
}
