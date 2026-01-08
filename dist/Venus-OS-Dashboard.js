/*

 Auto switch light/dark theme or manual choice
 
 so extra param tab

*/

console.info(
  "%c 🗲 %c - %cVenus OS BD%c - %c 🗲 \n%c version 0.1.17 ",
  "color: white; font-weight: bold; background: black",
  "color: orange; font-weight: bold; background: blue; font-weight: bold;",
  "color: white; font-weight: bold; background: blue; text-decoration: underline; text-decoration-color: orange; text-decoration-thickness: 5px; text-underline-offset: 2px;",
  "color: orange; font-weight: bold; background: blue; font-weight: bold;",
  "color: white; font-weight: bold; background: black",
  "color: white; font-weight: bold; background: grey"
);

import './editor.js';
import * as libVenus from './lib-venus.js';

import { cssDataDark } from './css-dark.js?v=0.1';
import { cssDataLight } from './css-light.js?v=0.1';

class venusOsDashboardCard extends HTMLElement {

  static isDark = true;

  static periodicTaskStarted = false;

  static cycle = 0;

  constructor() {
    super();

    // Listen for custom event
    document.addEventListener('config-changed', (event) => {
      // if(event.detail.redrawRequired) libVenus.razDashboardOldWidth();
      libVenus.razDashboardOldWidth();
    });

  }

  setConfig(config) {

    this.config = config;

    // Create static structure after receiving configuration
    if (!this.content) {
      this._createCardStructure();
    }
  }

  _createCardStructure() {

    // Initialize the content if it's not there yet.
    if (!this.content) {

      const cardElem = document.createElement('ha-card');
      this.appendChild(cardElem);

      const contElem = document.createElement('div');
      contElem.setAttribute('id', 'db-container');
      contElem.setAttribute('class', 'db-container');
      cardElem.appendChild(contElem);

      this.content = this.querySelector("div");

      window.contElem = this.content;

    }

    // Retrieve parameters
    const param = this.config.param || [];

    // Render basic card structure (in normal or "image" demo mode)
    libVenus.baseRender(this.config, this.content);

    // Retrieve quantity of boxes to create per column from parameters
    const boxCol1 = param.boxCol1 ? Math.min(Math.max(param.boxCol1, 1), 4) : 1;
    const boxCol2 = param.boxCol2 ? Math.min(Math.max(param.boxCol2, 1), 2) : 1;
    const boxCol3 = param.boxCol3 ? Math.min(Math.max(param.boxCol3, 1), 4) : 1;

    // Add boxes
    if (this.config.demo !== true) libVenus.addBox(boxCol1, boxCol2, boxCol3, this.content);

    // Add line attachment anchors
    if (this.config.demo !== true) libVenus.addAnchors(this.config, this.content);

  }

  set hass(hass) {

    this._hass = hass;

    if (this._hass) {

      // Check the selected theme
      const isDarkTheme = this._hass.themes.darkMode;

      // Create or update the style element based on the theme
      let style = this.querySelector('style');
      if (!style) {
        style = document.createElement('style');
        this.querySelector('ha-card').appendChild(style);
      }

      if ((isDarkTheme && this.config.theme === 'auto') || this.config.theme === 'dark') {
        style.textContent = cssDataDark();
        venusOsDashboardCard.isDark = true;
      } else {
        style.textContent = cssDataLight();
        venusOsDashboardCard.isDark = false;
      }
    }

    // Pause (or stop proceeding) if demo mode
    if (this.config.demo === true) return;

    // Pause (or stop proceeding) if debug
    if (venusOsDashboardCard.cycle >= 10) return;

    // Retrieve card parameters
    const devices = this.config.devices || [];
    const styles = this.config.styles || "";

    // Fill boxes with given parameters
    libVenus.fillBox(this.config, styles, venusOsDashboardCard.isDark, hass, this.content);

    // Check for size change... if yes re-create lines
    libVenus.checkReSize(devices, venusOsDashboardCard.isDark, this.content);

    // Check values for path animation reversal
    libVenus.checkForReverse(devices, hass);

    // Initial launch of startPeriodicTask
    if (!this.periodicTaskStarted) {
      // console.log('Attempting to start startPeriodicTask...');
      const taskStarted = libVenus.startPeriodicTask(this.config, hass);

      if (taskStarted) {
        // console.log('startPeriodicTask started successfully.');
        this.periodicTaskStarted = true; // Mark as started
      } else {
        // console.warn('startPeriodicTask failed. It will be retried in the next iteration.');
        this.periodicTaskStarted = false; // Stay on false to retry
      }
    }

    // venusOsDashboardCard.cycle++;
  }

  // Method to generate configuration element
  static getConfigElement(hass) {
    const editor = document.createElement('venus-os-editor');
    editor.hass = hass; // Explicitly pass hass instance to editor
    return editor;
  }

  /*static getStubConfig() {
      return { 
          demo: true,
      };
  }*/

  static getStubConfig(hass) {
    // get available power entities
    return libVenus.getDefaultConfig(hass);
  }

  // Method to retrieve card size
  getCardSize() {
    return 1;
  }

  // Cleanup function if card is removed
  disconnectedCallback() {
    libVenus.clearAllIntervals(); // Stop all tasks
  }

}
customElements.define('venus-os-dashboard', venusOsDashboardCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: 'venus-os-dashboard',
  name: 'Venus OS Dashboard',
  preview: true,
  description: 'A DashBoard that looklike Venos OS gui-v2 from Victron.',
});
