'use strict';

// Load the node-enocean-ble and get a `EnoceanBle` constructor object
const EnoceanBle = require('../lib/enocean-ble.js');
// Create an `EnoceanBle` object
const enocean = new EnoceanBle();

// Commissioning (Easyfit Double Rocker Wall Switch)
enocean.commission('30SE21500018401+Z38C1D339863D7F8DA69C3FC159F07F0B+30PE8221-A280+2PDC03+S07015410');
// Commissioning (STM 550B Multisensor Module)
enocean.commission('30SE500100007FD+Z2358E2F4682E641AE1C63C99EE7F5984+30PS6221-K516+2PDA05+S01577802000303');

// Set a callback for incomming telegrams
enocean.ondata = (telegram) => {
  console.log(telegram);
};

// Start to monitor telegrams
enocean.start().then(() => {
  // Successfully started to monitor telegrams
}).catch((error) => {
  // Failed to start to monitor telegrams
  console.error(error);
});