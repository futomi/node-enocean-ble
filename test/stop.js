'use strict';
const mEnoceanBle = require('../lib/enocean-ble.js');
const enocean = new mEnoceanBle();

// Sensor
enocean.commission('30SE500100007FD+Z2358E2F4682E641AE1C63C99EE7F5984+30PS6221-K516+2PDA05+S01577802000303');
// Switch
enocean.commission('30SE21500018401+Z38C1D339863D7F8DA69C3FC159F07F0B+30PE8221-A280+2PDC03+S07015410');

enocean.ondata = (telegram) => {
  console.log(telegram);
};

(async () => {
  await enocean.start();
  console.log('Started.');
  await wait(10000);
  await enocean.stop();
  console.log('Stopped.');
})();

function wait(msec) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, msec);
  });
}