/* ------------------------------------------------------------------
* node-enocean-ble - enocean-ble-telegram-parser.js
*
* Copyright (c) 2020, Futomi Hatano, All rights reserved.
* Released under the MIT license
* Date: 2020-09-28
* ---------------------------------------------------------------- */
'use strict';
const mEnoceanBleSignature = require('./enocean-ble-signature.js');

class EnoceanBleTelegramParser {
  /* ------------------------------------------------------------------
  * Constructor
  *	
  * [Arguments]
  * - None
  * ---------------------------------------------------------------- */
  constructor() {
    this._ORDERING_CODE_MAP = {
      // EnOcean PTM 215B Bluetooth Pushbutton Transmitter Module
      'S3221-A215': 'button', // PTM 215B, Module only
      'E8221-A270': 'button', // EWSSB, Wall Switch (Single Rocker)
      'E8221-A280': 'button', // EWSDB, Wall Switch (Double Rocker)
      'ESRPB-W-EO': 'button', // ESRPB, Rocker Pad (Single Rocker)
      'EDRPB-W-EO': 'button', // EDRPB, Rocker Pad (Double Rocker)

      // EASYFIT Multisensor For IoT Applications (2.4 GHz BLE)
      'S6221-K516': 'sensor', // STM 550B, Module only 100 unit packaging
      'B6221-K516': 'sensor', // STM 550B KIT, Module with installation material 100 unit packaging
      'E6221-K516': 'sensor'  // EMSIB, Module with installation material Single unit packaging
    };

    this._MANUFACTURER_ID = 0x03da;
    this._sequences = {};
  };

  /* ------------------------------------------------------------------
  * isSupportedOrderingCode(ocode)
  * - Check if the specified ordering code is supported.
  *
  * [Arguments]
  * - ocode  | String | Required | Ordering code
  * 
  * 
  * [Return value]
  * - If the code is supported, `true` is returned. Otherwise, `false`
  *   is returned.
  * ---------------------------------------------------------------- */
  isSupportedOrderingCode(ocode) {
    return (ocode in this._ORDERING_CODE_MAP) ? true : false;
  }

  /* ------------------------------------------------------------------
  * parse(peripheral, cdata)
  * - Parse a telgram
  *
  * [Arguments]
  * - cdata  | Object | Required | Commissioning data
  * 
  * The `cdata` is as below:
  *   {
  *     "address": "e21500012345",
  *     "securityKey": "38c1d339863d7f8d0000000000000000",
  *     "orderingCode": "E8221-A280",
  *     "stepCodeRevision": "DC-03",
  *     "manufacturer": "07",
  *     "serial": "000001"
  *   }
  * 
  * [Return value]
  * - If the telegram is parsed successfully, an object will be returned:
  * 
  * {
  *   address: 'e21500012345',
  *   manufacturer: '03da',
  *   sequence: 1435,
  *   type: 'button',
  *   data: { button: 'B0', pressed: true },
  *   signature: '6daea9f1',
  *   authenticated: true,
  *   replayed: false
  * }
  *
  * - If the telegram is faled to parsed, `null` will be returned.
  * ---------------------------------------------------------------- */
  parse(peripheral, cdata) {
    if (cdata && peripheral.id !== cdata.address) {
      return null;
    }

    let ad = peripheral.advertisement;
    if (!ad) {
      return null;
    }
    let manu_buf = ad.manufacturerData;
    if (!manu_buf) {
      return null;
    }

    if (manu_buf.length < 11) {
      return null;
    }

    // Check the manufacturer ID
    if (manu_buf.readUInt16LE(0) !== this._MANUFACTURER_ID) {
      return null;
    }

    // Parse the sensor data telegram
    if (cdata) {
      let data = this._parseData(peripheral, cdata);
      if (data) {
        return data;
      }
    }

    // Parse the commissioning telegram
    let data = this._parseCommissioning(peripheral);
    return data;
  }

  _parseData(peripheral, cdata) {
    let manu_buf = peripheral.advertisement.manufacturerData;

    // Check if the telegram comming from the commissioned device
    let ocode = cdata.orderingCode;
    let dtype = this._ORDERING_CODE_MAP[ocode];
    if (!dtype) {
      return null;
    }
    // Sensor Data
    let data_buf = manu_buf.slice(6, manu_buf.length - 4);
    let data = null;

    if (dtype === 'button') {
      // EnOcean PTM 215B Bluetooth Pushbutton Transmitter Module
      data = this._parseDataButton(data_buf);
    } else if (dtype === 'sensor') {
      // EASYFIT Multisensor For IoT Applications (2.4 GHz BLE)
      data = this._parseDataSensor(data_buf);
    }
    if (!data) {
      return null;
    }

    // Authenticate the telegram
    let authenticated = this._authenticate(peripheral, cdata);

    // Check if the telegram was replayed
    let seq = manu_buf.readUInt32LE(2);
    let replayed = this._checkReplayedTelegram(peripheral.id, seq);

    let res = {
      address: peripheral.id,
      manufacturer: Buffer.from([manu_buf[1], manu_buf[0]]).toString('hex'),
      sequence: manu_buf.readUInt32LE(2),
      type: dtype,
      data: data,
      signature: manu_buf.slice(manu_buf.length - 4).toString('hex'),
      authenticated: authenticated,
      replayed: replayed
    };

    return res;
  }

  _checkReplayedTelegram(address, seq) {
    let replayed = false;
    if (address in this._sequences) {
      let last_seq = this._sequences[address];
      if (seq === last_seq) {
        replayed = true;
      } else if (seq < last_seq) {
        if (last_seq !== 0xFFFFFFFF) {
          replayed = true;
        }
      }
    }
    this._sequences[address] = seq;
    return replayed;
  }

  // EnOcean PTM 215B Bluetooth Pushbutton Transmitter Module
  _parseDataButton(data_buf) {
    let data = {
      button: '',
      pressed: false
    };

    let status = data_buf.readUInt8(0);
    if (status & 0b00010000) {
      data.button = 'B1';
    } else if (status & 0b00001000) {
      data.button = 'B0';
    } else if (status & 0b00000100) {
      data.button = 'A1';
    } else if (status & 0b00000010) {
      data.button = 'A0';
    }

    data.pressed = (status & 0b00000001) ? true : false;

    return data;
  }

  // EASYFIT Multisensor For IoT Applications (2.4 GHz BLE) Sensor data
  _parseDataSensor(data_buf) {
    let data = {};
    let offset = 0;
    let fail = false;
    while (offset < data_buf.length) {
      let descriptor = data_buf.readUInt8(offset);
      let size_code = (descriptor >>> 6);
      let type = descriptor & 0b00111111;

      let size = 0;
      if (size_code === 0b00) {
        size = 1;
      } else if (size_code === 0b01) {
        size = 2;
      } else if (size_code === 0b10) {
        size = 4;
      } else {
        fail = true;
        break;
      }
      offset += 1;

      if (offset + size > data_buf.length) {
        fail = true;
        break;
      }

      let content_buf = data_buf.slice(offset, offset + size);

      if (type === 0x00) {
        // Temperature (degC)
        data.temperature = content_buf.readInt16LE(0) / 100;
      } else if (type === 0x01) {
        // Voltage (mV)
        data.voltage = content_buf.readInt16LE(0) / 2;
      } else if (type === 0x02) {
        // Energy Level (%)
        data.energy = content_buf.readUInt8(0) / 2;
      } else if (type === 0x04) {
        // Illumination (Solar cell) (lx)
        data.illuminationSolarCell = content_buf.readUInt16LE(0);
      } else if (type === 0x05) {
        // Illumination (Sensor)
        data.illumination = content_buf.readUInt16LE(0);
      } else if (type === 0x06) {
        // Relative Humidity (%RH)
        data.humidity = content_buf.readUInt8(0) / 2;
      } else if (type === 0x0A) {
        // Acceleration Vector (g)
        let cont = content_buf.readUInt32BE(0);
        let status = ((cont & 0xC0000000) >>> 30);
        let status_desc = '';
        if (status === 0b00) {
          status_desc = 'Acceleration value out of bound';
        } else if (status === 0b01) {
          status_desc = 'Periodic update';
        } else if (status === 0b10) {
          status_desc = 'Acceleration wake';
        } else if (status === 0b11) {
          status_desc = 'Sensor disabled';
        }
        data.acceleration = {
          status: status,
          description: status_desc,
          x: (((cont & 0x3FF00000) >>> 20) - 512) / 100,
          y: (((cont & 0x000FFC00) >>> 10) - 512) / 100,
          z: ((cont & 0x000003FF) - 512) / 100
        }
      } else if (type === 0x23) {
        // Magnet Contact
        let v = content_buf.readUInt8(0);
        if (v === 0x01) {
          data.contact = false; // open
        } else if (v === 0x02) {
          data.contact = true; // close
        }
      }

      offset += size;
    }
    if (fail) {
      return null;
    } else {
      return data;
    }
  }

  _authenticate(peripheral, cdata) {
    let manu_buf = peripheral.advertisement.manufacturerData;

    // AES128 Nonce
    let addr_buf = Buffer.alloc(6);
    (peripheral.address.split(':').reverse()).forEach((hex, i) => {
      addr_buf[i] = parseInt(hex, 16);
    });
    let seq_buf = manu_buf.slice(2, 6);
    let pad_buf = Buffer.from([0x00, 0x00, 0x00]);
    let aes128_nonce_buf = Buffer.concat([addr_buf, seq_buf, pad_buf]);

    // Authenticated payload
    let len = 1 + manu_buf.length;
    let auth_payload_buf = Buffer.concat([
      Buffer.from([len, 0xff]),
      manu_buf.slice(0, manu_buf.length - 4)
    ]);

    // Calculate the security signature
    let key_buf = Buffer.from(cdata.securityKey, 'hex');
    let calculated_sig_buf = mEnoceanBleSignature.calculate(key_buf, aes128_nonce_buf, auth_payload_buf);

    // Compare the signatures
    let telegram_sig_buf = manu_buf.slice(manu_buf.length - 4);
    let authenticated = (calculated_sig_buf.compare(telegram_sig_buf) === 0) ? true : false;
    return authenticated;
  }

  _parseCommissioning(peripheral) {
    let manu_buf = peripheral.advertisement.manufacturerData;
    let seq = manu_buf.readUInt32LE(2);

    let res = {
      address: peripheral.id,
      manufacturerId: Buffer.from([manu_buf[1], manu_buf[0]]).toString('hex'),
      sequence: seq,
      type: 'commissioning',
      data: {
        key: '',
        address: ''
      },
      replayed: false
    };

    // Check if the telegram was replayed
    res.replayed = this._checkReplayedTelegram(peripheral.id, seq);

    if (manu_buf.length === 28) {
      // EnOcean PTM 215B Bluetooth Pushbutton Transmitter Module
      res.data.key = manu_buf.slice(6, 22).toString('hex');
      res.data.address = this._reverseBufBytes(manu_buf.slice(22)).toString('hex');
      return res;

    } else if (manu_buf.length === 29) {
      // EASYFIT Multisensor For IoT Applications (2.4 GHz BLE) Sensor data
      let descriptor = manu_buf.readUInt8(6);
      let type = descriptor & 0b00111111;
      if (type === 0x3E) {
        res.data.key = manu_buf.slice(7, 23).toString('hex');
        res.data.address = this._reverseBufBytes(manu_buf.slice(23)).toString('hex');
        return res;
      }
    }

    return null;
  }

  _reverseBufBytes(buf) {
    let len = buf.length;
    let rbuf = Buffer.alloc(len);
    for (let i = 0; i < len; i++) {
      rbuf[len - i - 1] = buf[i];
    }
    return rbuf;
  }

}

module.exports = new EnoceanBleTelegramParser();
