'use strict';
const mEnoceanBle = require('../lib/enocean-ble.js');
const enocean = new mEnoceanBle();

// NFC Sensor
let cdata1 = enocean.commission('30SE500100007FD+Z2358E2F4682E641AE1C63C99EE7F5984+30PS6221-K516+2PDA05+3C31+16S01000000');
console.log(cdata1);

// QR Sensor
let cdata2 = enocean.commission('30SE500100007FD+Z2358E2F4682E641AE1C63C99EE7F5984+30PS6221-K516+2PDA05+S01577802000303');
console.log(cdata2);

// QR Switch
let cdata3 = enocean.commission('30SE21500018401+Z38C1D339863D7F8DA69C3FC159F07F0B+30PE8221-A280+2PDC03+S07015410');
console.log(cdata3);


enocean.ondata = (telegram) => {
    console.log(telegram);
};

enocean.start().then(() => {

}).catch((error) => {
  console.error(error);
});