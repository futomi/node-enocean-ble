'use strict';
const mEnoceanBle = require('../lib/enocean-ble.js');
const enocean = new mEnoceanBle();

// Sensor
enocean.addCommission({
  address: 'E500100007FD',
  securityKey: '2358E2F4682E641AE1C63C99EE7F5984',
  orderingCode: 'S6221-K516'
});

// Switch
enocean.addCommission({
  address: 'E21500018401',
  securityKey: '38C1D339863D7F8DA69C3FC159F07F0B',
  orderingCode: 'E8221-A280'
});

let cdata_list = enocean.getCommissions();
console.log('Registered commissions:');
//console.log(JSON.stringify(commissions, null, '  '));
console.log(cdata_list);

let deleted_commission = enocean.deleteCommission('E21500018401');
console.log('- Deleted commission:');
console.log(JSON.stringify(deleted_commission, null, '  '));

let new_commissions = enocean.getCommissions();
console.log('- Registered commissions:');
console.log(JSON.stringify(new_commissions, null, '  '));
