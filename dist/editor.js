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
                /* Force Tab Layout */
                sl-tab-group {
                  display: flex;
                  flex-wrap: wrap;
                  width: 100%;
                  border-bottom: 1px solid var(--divider-color, #ccc);
                  --indicator-color: var(--primary-color, #03a9f4);
                }
                sl-tab {
                    flex: 1; /* Distribute space evenly */
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 12px 16px;
                    cursor: pointer;
                    border-bottom: 2px solid transparent;
                    color: var(--secondary-text-color);
                    font-weight: 500;
                    white-space: nowrap;
                }
                sl-tab[active] {
                    border-bottom-color: var(--indicator-color);
                    color: var(--primary-text-color);
                }
                sl-tab ha-icon {
                    margin-right: 8px;
                    --mdc-icon-size: 20px;
                }
                sl-tab-panel {
                  display: none; /* Hidden by default */
                  width: 100%;
                  padding: 1em;
                  background: var(--card-background-color);
                  box-sizing: border-box;
                }
                sl-tab-panel[active] {
                  display: block; /* Show when active */
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
        
        // Manual active class management since we are faking the tabs behavior a bit
        this.shadowRoot.querySelectorAll('#tab-group sl-tab').forEach(tab => {
            if (parseInt(tab.getAttribute('data-tab')) === this._currentTab) {
                tab.setAttribute('active', '');
            } else {
                tab.removeAttribute('active');
            }
        });
        this.shadowRoot.querySelectorAll('#tab-group sl-tab-panel').forEach(panel => {
            // Logic to show panel, currently we use one panel 'conf' and inject content
            // So just ensure the main panel is active
            panel.setAttribute('active', '');
        });

        if (this._currentTab === 0) {
            libEditor.tab1Render(this);
        } else if (this._currentTab === 1) {
            libEditor.tabColRender(1, this);
        } else if (this._currentTab === 2) {
            libEditor.tabColRender(2, this);
        } else if (this._currentTab === 3) {
            libEditor.tabColRender(3, this);
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
