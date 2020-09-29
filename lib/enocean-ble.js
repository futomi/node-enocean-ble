/* ------------------------------------------------------------------
* node-enocean-ble - enocean-ble.js
*
* Copyright (c) 2020, Futomi Hatano, All rights reserved.
* Released under the MIT license
* Date: 2020-09-27
* ---------------------------------------------------------------- */
'use strict';
const mEnoceanBleTelegramParser = require('./enocean-ble-telegram-parser.js');

class EnoceanBle {
  /* ------------------------------------------------------------------
  * Constructor
  *	
  * [Arguments]
  * - params  | Object  | Optional |
  *   - noble | Noble   | Optional | The Nobel object created by the noble module.
  *           |         |          | This parameter is optional.
  *           |         |          | If you don't specify this parameter, this
  *           |         |          | module automatically creates it.
  * ---------------------------------------------------------------- */
  constructor(params) {
    let noble = null;
    if (params && params.noble) {
      noble = params.noble;
    } else {
      noble = require('@abandonware/noble');
    }

    this._noble = noble;
    this._ondata = () => { };
    this._initialized = false;
    this._devices = {};
    this._filters = {
      auth: true,
      replay: true
    };
    this._monitoring = false;
  };

  set ondata(func) {
    if (!func || typeof (func) !== 'function') {
      throw new Error('The `ondata` must be a function.');
    }
    this._ondata = func;
  }

  /* ------------------------------------------------------------------
  * getCommissions()
  * - Get a list of the registered commissions
  *
  * [Arguments]
  * - None
  * 
  * [Return value]
  * - An array containing the registered commissionings:
  * ---------------------------------------------------------------- */
  getCommissions() {
    let list = Object.values(this._devices);
    return JSON.parse(JSON.stringify(list));
  }

  /* ------------------------------------------------------------------
  * commission(cstring)
  * - Register an EnOcean BLE device using commissioning data from QR
  *   code or NFC
  *
  * [Arguments]
  * - cstring  | String | Required | Commissioning data string
  * 
  * You can obtain the commissioning data string from the QR code or NFC.
  * 
  * QR code
  * - "30SE21500012345+Z38C1D339863D7F8D0000000000000000+30PE8221-A280+2PDC03+S07000001"
  * NFC
  * - "30SE50010012345+Z2358E2F4682E641A0000000000000000+30PS6221-K516+2PDA05+3C31+16S01000000"
  *
  * [Return value]
  * - An object containing the parsed commissioning data:
  * - QR code
  *   {
  *     "address": "e21500012345",
  *     "securityKey": "38c1d339863d7f8d0000000000000000",
  *     "orderingCode": "E8221-A280",
  *     "stepCodeRevision": "DC-03",
  *     "serial": "07000001"
  *   }
  * - NFC
  *   {
  *     "address": "e50010012345",
  *     "securityKey": "2358e2f4682e641a0000000000000000",
  *     "orderingCode": "S6221-K516",
  *     "stepCodeRevision": "DA-05",
  *     "serial": ""
  *   }
  * 
  * - If the address in the specified commissioning data string has been
  *   already registered, the old one will be replaced by the new one.
  * - The address and the security key is lower-cased.
  * ---------------------------------------------------------------- */
  commission(cstring) {
    if (!cstring || typeof (cstring) !== 'string') {
      throw new Error('The `cstring` (commissioning data) must be a non-empty string.');
    }
    let m = cstring.match(/^30S([0-9a-fA-F]{12})\+Z([0-9a-fA-F]{32})\+30P([^\+]{10})\+2P([^\/+]{4,})\+/);
    if (!m) {
      throw new Error('The `cstring` (commissioning data) is invalid.')
    }

    let cdata = {
      address: m[1].toLowerCase(),
      securityKey: m[2].toLowerCase(),
      orderingCode: m[3],
      stepCodeRevision: m[4].substring(0, 2) + '-' + m[4].substring(2, 4),
      serial: ''  // QR code only
    };
    let m1 = cstring.match(/\+S([0-9a-fA-F]+)/);
    if (m1) {
      let v = m1[1];
      if (v.length >= 8) {
        cdata.serial = v;
      }
    }

    this._devices[cdata.address] = cdata;
    return JSON.parse(JSON.stringify(cdata));
  }

  /* ------------------------------------------------------------------
  * addCommission(cdata)
  * - Add a commission
  *
  * [Arguments]
  * - cdata          | Object | Required |
  *   - address      | String | Required | Source Address
  *   - securityKey  | String | Required | AES128 Security Key
  *   - orderingCode | String | Required | Ordering Code
  *
  * - The `address` and `securityKey` must be specified in hexadecimal
  *   representation. They are not case-sensitive.
  * 
  * example:
  * {
  *   "address": "e50010012345",
  *   "securityKey": "2358e2f4682e641a0000000000000000",
  *   "orderingCode": "S6221-K516"
  * }
  *
  * [Return value]
  * - An object containing the parsed commissioning data:
  *   {
  *     "address": "e50010012345",
  *     "securityKey": "2358e2f4682e641a0000000000000000",
  *     "orderingCode": "S6221-K516",
  *     "stepCodeRevision": "",
  *     "serial": ""
  *   }
  * 
  * - If the address in the specified commissioning data has been
  *   already registered, the old one will be replaced by the new one.
  * - The address and the security key is lower-cased.
  * ---------------------------------------------------------------- */
  addCommission(cdata) {
    if (!cdata || typeof (cdata) !== 'object') {
      throw new Error('The `cdata` must be an object.');
    }

    // Check the `address`
    if (!('address' in cdata)) {
      throw new Error('The `address` is required.');
    }
    let address = cdata.address;
    if (typeof (address) !== 'string' || !/^[a-fA-F0-9]{12}$/.test(address)) {
      throw new Error('The `address` must be a hex representation of the MAC address (6 bytes).');
    }
    address = address.toLowerCase();

    // Check the `securityKey`
    if (!('securityKey' in cdata)) {
      throw new Error('The `securityKey` is required.');
    }
    let skey = cdata.securityKey;
    if (typeof (skey) !== 'string' || !/^[a-fA-F0-9]{32}$/.test(skey)) {
      throw new Error('The `securityKey` must be a hex representation of the security key (16 bytes).');
    }
    skey = skey.toLowerCase();

    // Check the `orderingCode`
    if (!('orderingCode' in cdata)) {
      throw new Error('The `orderingCode` is required.');
    }
    let ocode = cdata.orderingCode;
    if (typeof (ocode) !== 'string') {
      throw new Error('The `orderingCode` is required.');
    }
    if (!mEnoceanBleTelegramParser.isSupportedOrderingCode(ocode)) {
      throw new Error('The `orderingCode` is not supported.');
    }

    let new_cdata = {
      address: address,
      securityKey: skey,
      orderingCode: ocode,
      stepCodeRevision: '',
      serial: ''
    };
    this._devices[address] = new_cdata;

    return JSON.parse(JSON.stringify(new_cdata));
  }

  /* ------------------------------------------------------------------
  * deleteCommission(address)
  * - Delete a commission
  *
  * [Arguments]
  * - address      | String | Required | Source Address
  *
  * - The `address` is not case-sensitive.
  * 
  * [Return value]
  * - An object containing the parsed commissioning data:
  *   {
  *     "address": "e50010012345",
  *     "securityKey": "2358e2f4682e641a0000000000000000",
  *     "orderingCode": "S6221-K516",
  *     "stepCodeRevision": "",
  *     "serial": ""
  *   }
  * 
  * - If the `address` has not been registered, `null` will be returned.
  * ---------------------------------------------------------------- */
  deleteCommission(address) {
    if (typeof (address) !== 'string' || !/^[a-fA-F0-9]{12}$/.test(address)) {
      throw new Error('The `address` must be a hex representation of the MAC address (6 bytes).');
    }
    address = address.toLowerCase();
    let cdata = this._devices[address] || null;
    delete this._devices[address];
    return cdata;
  }

  /* ------------------------------------------------------------------
  * start(filters)
  * - Start to monitor advertizing packet comming from EnOcean BEL devices
  *
  * [Arguments]
  * - filters   | Object  | Optional |
  *   - auth    | Boolean | Optional | If `true`, unauthenticated telegrams will be ignored.
  *             |         |          | The default value is `true`.
  *   - replay  | Boolean | Optional | If `true`, replayed telegrams will be ignored.
  *             |         |          | The default value is `true`.
  * 
  * [Return value]
  * - Promise object
  *   Nothing will be passed to the `resolve()`.
  * ---------------------------------------------------------------- */
  async start(filters) {
    // Initialize the noble object
    await this._init();

    let params = {
      auth: true,
      replay: true
    };

    // Check the `filter`
    if (filters) {
      if (typeof (filters) !== 'object') {
        throw new Error('The `filter` must be an object.');
      }
    }

    if (filters) {
      if ('auth' in filters) {
        let v = filters.auth;
        if (typeof (v) !== 'boolean') {
          throw new Error('The `auth` must be boolean.');
        }
        params.auth = v;
      }
      if ('replay' in filters) {
        let v = filters.replayed;
        if (typeof (v) !== 'boolean') {
          throw new Error('The `replay` must be boolean.');
        }
        params.replay = v;
      }
    }

    this._filters = params;

    // Set an handler for the 'discover' event
    this._noble.on('discover', this._receivedAdvPacket.bind(this));

    // Start scaning
    if (!this._monitoring) {
      await this._startScanning();
    }
    this._monitoring = true;
  }

  _receivedAdvPacket(peripheral) {
    let cdata = this._devices[peripheral.id];
    let telegram = null;
    try {
      telegram = mEnoceanBleTelegramParser.parse(peripheral, cdata);
    } catch (error) {
      console.error(error);
    }
    if (!telegram) {
      return;
    }

    if (this._filters.auth === true) {
      if (telegram.authenticated === false) {
        return;
      }
    }

    if (this._filters.replay === true) {
      if (telegram.replayed === true) {
        return;
      }
    }

    this._ondata(telegram);;
  }

  _init() {
    return new Promise((resolve, reject) => {
      if (this._initialized === true) {
        resolve();
        return;
      }
      if (this._noble.state === 'poweredOn') {
        this._initialized = true;
        resolve();
      } else {
        this._noble.once('stateChange', (state) => {
          if (state === 'poweredOn') {
            this._initialized = true;
            resolve();
          } else {
            let err = new Error('Failed to initialize the Noble object: ' + state);
            reject(err);
          }
        });
      }
    });
  }

  _startScanning() {
    return new Promise((resolve, reject) => {
      this._noble.startScanning([], true, (error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  /* ------------------------------------------------------------------
  * stop()
  * - Stop to monitor advertizing packet comming from EnOcean BEL devices
  *
  * [Arguments]
  * - none
  *
  * [Return value]
  * - Promise object
  *   Nothing will be passed to the `resolve()`.
  * ---------------------------------------------------------------- */
  stop() {
    return new Promise((resolve, reject) => {
      this._noble.removeAllListeners('discover');
      this._noble.stopScanning((error) => {
        this._monitoring = false;
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

}

module.exports = EnoceanBle;
