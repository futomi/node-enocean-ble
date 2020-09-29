/* ------------------------------------------------------------------
* node-enocean-ble - enocean-ble-signature.js
*
* Copyright (c) 2020, Futomi Hatano, All rights reserved.
* Released under the MIT license
* Date: 2020-09-26
* ---------------------------------------------------------------- */
'use strict';
const mCrypto = require('crypto');

class EnOceanBleSignature {
  /* ------------------------------------------------------------------
  * Constructor
  *	
  * [Arguments]
  * - None
  * ---------------------------------------------------------------- */
  constructor() {
    this._A0_FLAG = Buffer.from([0x01]);
    this._B0_FLAG = Buffer.from([0x49]);
  }

  /* ------------------------------------------------------------------
  * calculate(key, nonce, data)
  * - Calculate the security signature based on AES128 in CCM
  *   (Counter with CBC-MAC) mode as described in IETF RFC3610
  *
  * [Arguments]
  * - key   | Buffer | Required | Security Key (16 bytes)
  * - nonce | Buffer | Required | AES128 Nonce (13 bytes)
  * - data  | Buffer | Required | Authenticated telegram payload
  *
  * The `key` is a device-specific key embedded in the QR code on
  * the device.
  * 
  * The `nonce` consists of 3 components:
  * - Source Address (6 bytes) 
  * - Sequence Counter (4 bytes)
  * - Padding (3 bytes) 0x000000
  * 
  * The `data` is the payload in the manufacturer data in the
  * advertising packet. It consists of 5 components:
  * - LEN (1 Byte)
  * - TYPE (1 Byte) always 0xFF
  * - MANUFACTURER (2 bytes) always 0xDA03
  * - Sequence Counter (4 bytes)
  * - Sensor data (the size depends on the device)
  *
  * [Return value]
  * - A Buffer object representing the calculated security signature.
  * - The byte length is 4.
  * ---------------------------------------------------------------- */
  calculate(key, nonce, data) {
    const a0 = Buffer.concat([this._A0_FLAG, nonce, Buffer.from([0x00, 0x00])]);
    const b0 = Buffer.concat([this._B0_FLAG, nonce, Buffer.from([0x00, 0x00])]);
    const s0 = this._AES128(a0, key);
    const BSIZE = 16;

    let input_len = Buffer.alloc(2);
    input_len.writeUInt16BE(data.length, 0);

    let mblock = Buffer.concat([input_len, data]);
    let mlen = mblock.length;
    let offset = 0;
    let output = b0;

    while (offset < mlen) {
      let is_last_block = false;
      let block = null;

      if (offset + BSIZE > mlen) {
        let pad = Buffer.alloc(BSIZE - (mlen % BSIZE), 0x00);
        block = Buffer.concat([mblock.slice(offset, mlen), pad]);
        is_last_block = true;
      } else if (offset + BSIZE === mlen) {
        block = mblock.slice(offset, mlen);
        is_last_block = true;
      } else {
        block = mblock.slice(offset, offset + BSIZE);
      }

      output = this._AES128(output, key);
      output = this._XOR(output, block);

      if (is_last_block) {
        output = this._AES128(output, key);
        output = this._XOR(output, s0);
        break;
      }

      offset += BSIZE;
    }

    let signature = output.slice(0, 4);
    return signature;
  }

  _AES128(data, key) {
    let iv = Buffer.alloc(16, 0x00);
    let cipher = mCrypto.createCipheriv('aes128', key, iv);
    let crypted = cipher.update(data);
    return crypted;
  }

  _XOR(data1, data2) {
    let res = Buffer.alloc(data1.length);
    for (let i = 0; i < data1.length; i++) {
      res[i] = data1[i] ^ data2[i];
    }
    return res;
  }

}

module.exports = new EnOceanBleSignature();
