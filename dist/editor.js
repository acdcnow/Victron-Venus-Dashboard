import {css} from './css-editor.js?v=0.1';

import * as libEditor from './lib-editor.js';

class venusOsDashBoardEditor extends HTMLElement {
    
    async setConfig(config) {
        this._config = { ...config, entities: { ...(config.entities || {}) } };
        
        await libEditor.loadTranslations(this);
    
        if (!this.shadowRoot) {
            
            this.attachShadow({ mode: 'open' });
            
            this.shadowRoot.innerHTML = `
              <style>
                sl-tab-group {
                  width: 100%;
                  --sl-tab-border-color: var(--divider-color, #ccc);
                  --indicator-color: var(--primary-color, #03a9f4);
                }
                sl-tab {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: 500;
                }
                sl-tab ha-icon {
                    margin-right: 8px;
                    --mdc-icon-size: 20px;
                }
                sl-tab-panel {
                  padding: 1em;
                  background: var(--card-background-color);
                }
              </style>
            
              <sl-tab-group id="tab-group">
                <sl-tab slot="nav" panel="conf" data-tab="0" active>
                    <ha-icon icon="mdi:cog"></ha-icon> Conf.
                </sl-tab>
                <sl-tab slot="nav" panel="conf" data-tab="1">
                    <ha-icon icon="mdi:view-column"></ha-icon> Col. 1
                </sl-tab>
                <sl-tab slot="nav" panel="conf" data-tab="2">
                    <ha-icon icon="mdi:view-column"></ha-icon> Col. 2
                </sl-tab>
                <sl-tab slot="nav" panel="conf" data-tab="3">
                    <ha-icon icon="mdi:view-column"></ha-icon> Col. 3
                </sl-tab>
            
                <sl-tab-panel id="sl-tab-content" name="conf">
                  <div id="tab-content" class="content"></div>
                </sl-tab-panel>
              </sl-tab-group>
            `;
            
            const tabGroup = this.shadowRoot.querySelector('#tab-group');
            
            /*tabGroup.addEventListener('sl-tab-show', (event) => {
                
              const panelName = event.detail.name; // "conf", "col1", etc.
              const tabIndexMap = {
                conf: 0,
                col1: 1,
                col2: 2,
                col3: 3,
              };
              this._currentTab = tabIndexMap[panelName] ?? 0;
              this.renderTabContent();
            });*/
            
            
            
            const style = document.createElement('style');
            style.textContent = css();
            tabGroup.appendChild(style);
            
            this._currentTab = 0;
            this._currentSubTab = 0;
            
            libEditor.attachLinkClick(this.renderTabContent.bind(this), this);

        }
        
        this.renderTabContent();
    }
    
    renderTabContent() {
        
        if (this._currentTab === 0) {
            
            libEditor.tab1Render(this);
            
            console.log("conf.");
            
        } else if (this._currentTab === 1) {
            
            libEditor.tabColRender(1, this);
            
            console.log("tab 1");
    
        } else if (this._currentTab === 2) {
            
            libEditor.tabColRender(2, this);
            
            console.log("tab 2");
            
        } else if (this._currentTab === 3) {
            
            libEditor.tabColRender(3, this);
            
            console.log("tab 3");
            
        }
    
        libEditor.attachInputs(this);
        
    }
  
    set hass(hass) {
        this._hass = hass;
    }
      
    get hass() {
        return this._hass;
    }
      
    get value() {
        return this._config;
    }
}

customElements.define('venus-os-editor', venusOsDashBoardEditor);
