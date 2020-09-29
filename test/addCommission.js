'use strict';
const mEnoceanBle = require('../lib/enocean-ble.js');
const enocean = new mEnoceanBle();

// Sensor
let cdata1 = enocean.addCommission({
  address: 'E500100007FD',
  securityKey: '2358E2F4682E641AE1C63C99EE7F5984',
  orderingCode: 'S6221-K516'
});
console.log(cdata1);

// Switch
let cdata2 = enocean.addCommission({
  address: 'E21500018401',
  securityKey: '38C1D339863D7F8DA69C3FC159F07F0B',
  orderingCode: 'E8221-A280'
});
console.log(cdata2);


enocean.ondata = (telegram) => {
    console.log(telegram);
};

enocean.start().then(() => {

}).catch((error) => {
  console.error(error);
});