node-enocean-ble
===============

The node-enocean-ble monitors and parses telegrams coming from [EnOcean BLE devices](https://www.enocean.com/en/products/enocean_modules_24ghz_ble/) (rocker wall switch and multisensor). This module supports telegram authentication based on AES128 in CCM (Counter with CBC-MAC) mode and replayed telegram detection.

## Supported OS

The node-enocean-ble supports only Linux-based OSes, such as Raspbian, Ubuntu, and so on. This module does not support Windows and Mac OS for now. (If [@abandonware/noble](https://github.com/abandonware/noble) is installed properly, this module might work well on such OSes.)

## Dependencies

* [Node.js](https://nodejs.org/en/) 12 +
* [@abandonware/noble](https://github.com/abandonware/noble)

See the document of the [@abandonware/noble](https://github.com/abandonware/noble) for details on installing the [@abandonware/noble](https://github.com/abandonware/noble).

Note that the noble must be run as root on most of Linux environments. See the document of the [@abandonware/noble](https://github.com/abandonware/noble) for details.

## Installation

Before installing the [@abandonware/noble](https://github.com/abandonware/noble), some linux libraries related Bluetooth as follows must be installed if the OS is Ubuntu/Debian/Raspberry OS.

```
$ sudo apt-get install bluetooth bluez libbluetooth-dev libudev-dev
```

If you use other OS, follow the instructions described in the document of the [@abandonware/noble](https://github.com/abandonware/noble).

After installing the libraries above, install the [@abandonware/noble](https://github.com/abandonware/noble) and the node-enocean-ble (this module) as follows:

```
$ cd ~
$ npm install @abandonware/noble
$ npm install node-enocean-ble
```

---------------------------------------
## Table of Contents
* [Commissioning](#Commissioning)
* [Quick Start](#Quick-Start)
* [`EnoceanBle` object](#EnoceanBle-object)
  * [`commission()` method](#EnoceanBle-commission-method)
  * [`addCommission()` method](#EnoceanBle-addCommission-method)
  * [`deleteCommission()` method](#EnoceanBle-deleteCommission-method)
  * [`getCommissions()` method](#EnoceanBle-getCommissions-method)
  * [`start()` method](#EnoceanBle-start-method)
  * [`stop()` method](#EnoceanBle-stop-method)
  * [`ondata` event handler](#EnoceanBle-ondata-event-handler)
* [Telegram objects](#Telegram-objects)
  * [`SwitchTelegram` object](#SwitchTelegram-object)
  * [`SensorTelegram` object](#SensorTelegram-object)
  * [`CommissioningTelegram` object](#CommissioningTelegram-object)
* [Supported EnOcean BLE devices](#Supported-EnOcean-BLE-devices)
* [Release Note](#Release-Note)
* [References](#References)
* [License](#License)

---------------------------------------
## <a id="Commissioning">Commissioning</a>

**Commissioning** is a process that the receiver (in this document, it is the node-enocean-ble) learns the EnOcean BLE devices. For commissioning, you need to obtain commissioning data from your EnOcean BLE device. The commissioning data consists of 3 components:

- Source address
- Security key
- Ordering code

In order to complete commissioning, all components above are required. The EnOcean BLE devices support 3 ways to obtain the commissioning data:

###  QR code commissioning

A QR code are printed in the back side of each EnOcean BLE device. You can read the QR code using a QR code reader app installed on your smartphone. The commissioning data is as follows:

```
30SE21500012345+Z38C1D339863D7F8D0000000000000000+30PE8221-A280+2PDC03+S07000001
```

See the description of the [`commission()`](#EnoceanBle-commission-method) method for more details.

### NFC commissioning

The multisensor products support NFC commissioning. Installing a NFC reader app on your smartphone, you can read the commissioning data touching the device with your smartphone. The commissioning data is as follows:

```
30SE50010012345+Z2358E2F4682E641A0000000000000000+30PS6221-K516+2PDA05+3C31+16S01000000
```

See the description of the [`commission()`](#EnoceanBle-commission-method) method for more details.

### Radio-based commissioning

The multisensor products have a LRN button. Pressing the button, a commissioning telegram is sent as a BLE advertising packet. The ndoe-enocean-ble supports such telegram, you can monitor and obtain the commissioning data.

But commissioning telegram contains only the source address and security key. In order to complete commissioning, you need to know the ordering code in advance. The ordering code is printed in the back side of the device.

See the description of the [`addCommission()`](#EnoceanBle-addCommission-method) method for more details.

---------------------------------------
## <a id="Quick-Start">Quick Start</a>

In order to monitor telegrams, load the node-enocean-ble, register your EnOcean BLE devices, set a callback for incoming telegrams, and start to monitor.

```JavaScript
// Load the node-enocean-ble and get a `EnoceanBle` constructor object
const EnoceanBle = require('node-enocean-ble');
// Create an `EnoceanBle` object
const enocean = new EnoceanBle();

// Commissioning (Easyfit Double Rocker Wall Switch)
enocean.commission('30SE21500012345+Z38C1D339863D7F8D0000000000000000+30PE8221-A280+2PDC03+S07000001');
// Commissioning (STM 550B Multisensor Module)
enocean.commission('30SE50010012345+Z2358E2F4682E641A0000000000000000+30PS6221-K516+2PDA05+3C31+16S01000000');

// Set a callback for incoming telegrams
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
```

When a telegram is received from the rocker wall switch, the code above will output the parsed telegram data as follows:

```javascript
{
  address: 'e21500012345',
  manufacturer: '03da',
  sequence: 1435,
  type: 'button',
  data: { button: 'B0', pressed: true },
  signature: '6daea9f1',
  authenticated: true,
  replayed: false
}
```

When a telegram is received from the multisensor, the code above will output the parsed telegram data as follows:

```javascript
{
  address: 'e50010012345',
  manufacturer: '03da',
  sequence: 47577,
  type: 'sensor',
  data: {
    temperature: 27.8,
    humidity: 66.5,
    illumination: 326,
    acceleration: {
      status: 3,
      description: 'Sensor disabled',
      x: 2.86,
      y: 3.57,
      z: 3.58
    },
    contact: false,
    voltage: 3222
  },
  signature: '10e650c8',
  authenticated: true,
  replayed: false
}
```

See the section "[Telegram objects](#Telegram-objects)" for the details.

---------------------------------------
## <a id="EnoceanBle-object">`EnoceanBle` object</a>

In order to use the node-enocean-ble, you have to load the node-enocean-ble module as follows:

```JavaScript
const EnoceanBle = require('node-enocean-ble');
```

You can get an `EnoceanBle` constructor from the code above. Then you have to create an `EnoceanBle` object from the `EnoceanBle` constructor as follows:

```javascript
const enocean = new EnoceanBle();
```

The `EnoceanBle` constructor takes an argument optionally. It must be a hash object containing the properties as follows:

Property | Type   | Required | Description
:--------|:-------|:---------|:-----------
`noble`  | Noble  | option   | a Noble object of the [`@abandonware/noble`](https://github.com/abandonware/noble) module

The node-enocean-ble module uses the [`@abandonware/noble`](https://github.com/abandonware/noble) module in order to interact with BLE devices. If you want to interact other BLE devices using the `@abandonware/noble` module, you can create a `Noble` object by yourself, then pass it to this module. If you don't specify a `Noble` object to the `noble` property, this module automatically create a `Noble` object internally.

The sample code below shows how to pass a `Noble` object to the `EnoceanBle` constructor.

```JavaScript
// Create a Noble object
const noble = require('@abandonware/noble');

// Create an `EnoceanBle` object
const EnoceanBle = require('../lib/enocean-ble.js');
const enocean = new EnoceanBle({ 'noble': noble });
;
```

In the code snippet above, the variable `enocean` is an `EnoceanBle` object. The `enocean` object has a lot of methods as described in sections below.

### <a id="EnoceanBle-commission-method">commission(<span style="color:gray">*cstring*</span>) method</a>

The `commission()` method registers an EnOcean BLE device using commissioning data string from QR code or NFC. This method takes a commissioning data.

```javascript
let cdata = enocean.commission('30SE21500012345+Z38C1D339863D7F8D0000000000000000+30PE8221-A280+2PDC03+S07000001');
```

This method returns an object representing the commissioning data parsed the commissioning data string:

```javascript
{
  address: 'e21500012345',
  securityKey: '38c1d339863d7f8d0000000000000000',
  orderingCode: 'E8221-A280',
  stepCodeRevision: 'DC-03',
  serial: '07000001'
}
```

The structure of the commissioning data object is as follows:

Property           | Type    | Description
:------------------|:--------|:--------------------------
`address`          | String  | Source Address
`securityKey`      | String  | Security Key
`orderingCode`     | String  | Ordering Code
`stepCodeRevision` | String  | Step Code - Revision
`serial`           | String  | Serial Number

If a commissioning data string from NFC is passed to this method, the value of the `serial` will be an empty string.

If the `address` in the specified commissioning data string has been already registered, the old one will be replaced by the new one.

### <a id="EnoceanBle-addCommission-method">addCommission(<span style="color:gray">*cdata*</span>) method</a>

The `addCommission()` method registers an EnOcean BLE device manually. This method takes an object containing commissioning data as follows:

Property                               | Type   | Required | Description
:--------------------------------------|:-------|:---------|:------------
`cdata`                                | Object | Required |
&nbsp;&nbsp;&nbsp;&nbsp;`address`      | String | Required | Source address
&nbsp;&nbsp;&nbsp;&nbsp;`securityKey`  | String | Required | AES128 security key
&nbsp;&nbsp;&nbsp;&nbsp;`orderingCode` | String | Required | Ordering code

The `address` and `securityKey` must be specified in hexadecimal representation. They are not case-sensitive.

This method is mainly used when you obtain the commissioning data from a commissioning telegram (Radio-based commissioning). The telegram contains the source address and security key, but the ordering code. You can see the ordering code on the back side of the device.

The supported ordering codes are shown in the section "[Supported EnOcean BLE devices](#Supported-EnOcean-BLE-devices)".

```javascript
let cdata = enocean.addCommission({
  address: 'E21500012345',
  securityKey: '38c1d339863d7f8d0000000000000000',
  orderingCode: 'E8221-A280'
});
console.log(cdata);
```

The code above will output the result as follows:

```javascript
{
  address: 'E21500012345',
  securityKey: '38c1d339863d7f8d0000000000000000',
  orderingCode: 'E8221-A280',
  stepCodeRevision: '',
  serial: ''
}
```

Each value of the `stepCodeRevision` and the `serial` is always an empty string.

### <a id="EnoceanBle-deleteCommission-method">deleteCommission(<span style="color:gray">*address*</span>) method</a>

The `deleteCommission()` method deletes a registered commissioning data. The address of the device must be passed to this method. The value of address is not case-sensitive. This method returns the deleted commissioning data object.

```javascript
let cdata = enocean.deleteCommission('E21500012345');
console.log(cdata);
```
The code above will output the result as follows:

```javascript
{
  address: 'E21500012345',
  securityKey: '38c1d339863d7f8d0000000000000000',
  orderingCode: 'E8221-A280',
  stepCodeRevision: '',
  serial: ''
}
```

### <a id="EnoceanBle-getCommissions-method">getCommissions() method</a>

The `getCommissions()` method gets a list of the registered commissioning data. This method return an `Array` object containing the registered commissioning data objects.

```javascript
let cdata_list = enocean.getCommissions();
console.log(cdata_list);
```

The code above will output the result as follows:

```javascript
[
  {
    address: 'e50010012345',
    securityKey: '2358e2f4682e641a0000000000000000',
    orderingCode: 'S6221-K516',
    stepCodeRevision: '',
    serial: ''
  },
  {
    address: 'e21500012345',
    securityKey: '38c1d339863d7f8d0000000000000000',
    orderingCode: 'E8221-A280',
    stepCodeRevision: '',
    serial: ''
  }
]
```

### <a id="EnoceanBle-start-method">start(<span style="color:gray">*[filters]*</span>) method</a>

The `start()` method starts to monitor telegrams coming from EnOcean BLE devices. This method returns a `Promise` object. This method takes an argument `filters` optionally.

Property                         | Type    | Required | Description
:--------------------------------|:--------|:---------|:------------
`filters`                        | Object  | Optional |
&nbsp;&nbsp;&nbsp;&nbsp;`auth`   | Boolean | Optional | If `true`, unauthenticated telegrams will be ignored. The default value is `true`.
&nbsp;&nbsp;&nbsp;&nbsp;`replay` | Boolean | Optional | If `true`, replayed telegrams will be ignored. The default value is `true`.

The node-enocean-ble supports the telegram authentication based on [AES128 in CCM (Counter with CBC-MAC) mode](https://en.wikipedia.org/wiki/CCM_mode). This mechanism ensures integrity and authenticity of transmitted telegrams. If the `auth` is set to `true`, unauthenticated telegrams will be ignored.

The EnOcean BLE devices send a telegram 2 or 3 times for purpose of ensuring the reachability. In normal cases, applications which use the node-enocean-ble might not need the replayed telegrams. The replay detection is used for cutting off the redundant telegrams and preventing replay attacks. The node-enocean-ble always checks a sequence counter in each telegram. If the counter in the telegram is less than or equal to the last counter, the telegram will be marks as a replayed telegram. If the `replay` is set to `true`, the replay detection is enabled and such telegrams will be ignored.

Whenever a telegram is received, the callback function set to the [`ondata`](#EnoceanBle-ondata-event-handler) will be called. When a telegram is received, a hash object representing the telegram will be passed to the callback function.

See the [Quick Start](#Quick-Start) section for more details.

### <a id="EnoceanBle-stop-method">stop() method</a>

The `stop()` method stops to monitor telegrams coming from EnOcean BLE devices. This method returns a `Promise` object.

```javascript
enocean.stop().then(() => {
  // Stopped to monitor successfully
}).catch((error) => {
  // Failed to stop to monitor
});
```

### <a id="EnoceanBle-ondata-event-handler">`ondata` event handler</a>

If a callback function is set to the `ondata` property, the callback function will be called whenever an telegram is received from a EnOcean BLE device during the monitoring process is active (from the moment when the [`start()`](#EnoceanBle-start-method) method is called, to the moment when the [`stop()`](#EnoceanBle-stop-method) method is called).

A [Telegram object](#Telegram-objects) will be passed to the callback function. See the "[Telegram objects](#Telegram-objects)" section for more details.

---------------------------------------
## <a id="Telegram-objects">Telegram objects</a>

After the [`start()`](#EnoceanBle-start-method) method is invoked, the [`ondata`](#EnoceanBle-ondata-event-handler) event handler will be called whenever a telegram comes from the EnOcean BLE devices. A telegram object is passed to the callback. There are 3 object types: [`SwitchTelegram`](#SwitchTelegram-object), [`SensorTelegram`](#SensorTelegram-object), and [`CommissioningTelegram`](#CommissioningTelegram-object) object. The basic structure of the object is as follows:

Property        | Type    | Description
:---------------|:--------|:-----------
`address`       | String  | Source address of the device. (e.g., `"cb4eb903c96d"`)
`manufacturer`  | String  | Manufacturer ID. The value is always `"03da"`, which means "EnOcean GmbH". [The ID is assigned by Bluetooth SIG](https://www.bluetooth.com/specifications/assigned-numbers/company-identifiers/).
`sequence`      | Integer | Sequence counter. The value is in the range of 0 to 0xFFFFFFFF.
`type`          | String  | Type of object. It could be `"button"` ([`SwitchTelegram`](#SwitchTelegram-object)), `"sensor"` ([`SensorTelegram`](#SensorTelegram-object)), or `"commissioning"` ([`CommissioningTelegram`](#CommissioningTelegram-object)).
`data`          | Object  | The structure depends on the type of object (the value of `type`). See the sections below for details.
`signature`     | String  | Security signature.
`authenticated` | Boolean | If the telegram was authenticated (verified) by the telegram authentication process based on AES128 in CCM (Counter with CBC-MAC) mode, the value will be `true`. Otherwise, the value will be `false`.
`replayed`      | Boolean | If the sequence counter (the value of `sequence`) is less than or equal to the last counter (i.e., the telegram is replayed), the value will be `true`. Otherwise, it will be `false`.

If the value of the `type` is `"commissioning"` ([`CommissioningTelegram`](#CommissioningTelegram-object)), the `signature` and `authenticated` do **not** exist in the object.

### <a id="SwitchTelegram-object">`SwitchTelegram` object</a>

When a button on a Rocker Wall Switch is pressed or released, a `SwichTelegram` object will be passed to the callback. The structure of the `data` in the object is as follows:

Property        | Type    | Description
:---------------|:--------|:-----------
`data`          | Object  | Button status
&nbsp;&nbsp;&nbsp;&nbsp;`button`  | String | Button name which was pressed or released. It could be `"A0"`, `"A1"`, `"B0"`, or `"B1"`.
&nbsp;&nbsp;&nbsp;&nbsp;`pressed` | String | Button action. When a button was pressed, the value will be `true`. When a button was released, the value will be `false`.

```javascript
{
  address: 'e21500012345',
  manufacturer: '03da',
  sequence: 1453,
  type: 'button',
  data: { button: 'A0', pressed: true },
  signature: '8649a1e6',
  authenticated: true,
  replayed: false
}
```

### <a id="SensorTelegram-object">`SensorTelegram` object</a>

When a telegram comes from a multisensor, a `SensorTelegram` object will be passed to the callback. The structure of the `data` in the object is as follows:

Property        | Type    | Description
:---------------|:--------|:-----------
`data`          | Object  | Sensor status
&nbsp;&nbsp;&nbsp;&nbsp;`temperature`  | Float   | Temperature (degC)
&nbsp;&nbsp;&nbsp;&nbsp;`humidity`     | Float   | Relative Humidity (%RH)
&nbsp;&nbsp;&nbsp;&nbsp;`illumination` | Integer | Illumination (lx)
&nbsp;&nbsp;&nbsp;&nbsp;`acceleration` | Object  | Acceleration (See the description below for more details)
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;`status`      | Integer | Status code
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;`description` | String  | Meaning of the status code
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;`x`           | Float   | Acceleration of the x-axis (g)
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;`y`           | Float   | Acceleration of the y-axis (g)
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;`z`           | Float   | Acceleration of the z-axis (g)
&nbsp;&nbsp;&nbsp;&nbsp;`contact`      | Boolean | Status of the Magnet Contact. `true` means "close", `false` means "open".
&nbsp;&nbsp;&nbsp;&nbsp;`voltage`      | Integer | Voltage of the backup battery (mV)
&nbsp;&nbsp;&nbsp;&nbsp;`energy`       | Integer | Energy Level (%)

The mapping of `acceleration.status` and `acceleration.description` is as follows:

`status` | `description`
:--------|:----------------------------
`0`      | Acceleration value out of bound
`1`      | Periodic update
`2`      | Acceleration wake
`3`      | Sensor disabled

<span style="color:red">For now, the `acceleration` is experimental.</span> The multisensor products seem to disable the report of acceleration by default. Unfortunately, I don't know how to enable the report of acceleration. Therefore, I'm not sure whether the result is correct or not.

If a backup battery is mounted in the device, the `voltage` exists while the `energy` does **not** exit, and vice versa.

- When a backup battery is mounted:

```javascript
{
  address: 'e50010012345',
  manufacturer: '03da',
  sequence: 47810,
  type: 'sensor',
  data: {
    temperature: 24.9,
    humidity: 64.5,
    illumination: 250,
    acceleration: {
      status: 3,
      description: 'Sensor disabled',
      x: 4.63,
      y: -4.15,
      z: 4.22
    },
    contact: false,
    voltage: 3222
  },
  signature: '3828b6b7',
  authenticated: true,
  replayed: false
}
```

- When a backup battery is **not** mounted:

```javascript
{
  address: 'e50010012345',
  manufacturer: '03da',
  sequence: 47825,
  type: 'sensor',
  data: {
    temperature: 26.4,
    humidity: 64,
    illumination: 291,
    acceleration: {
      status: 3,
      description: 'Sensor disabled',
      x: 4.95,
      y: -1.55,
      z: 4.22
    },
    contact: false,
    energy: 100
  },
  signature: '17103bcf',
  authenticated: true,
  replayed: false
}
```

### <a id="CommissioningTelegram-object">`CommissioningTelegram` object</a>

When the LRN button on the multisensor is pressed, a `CommissioningTelegram` object will be passed to the callback. The structure of the `data` in the object is as follows:

Property        | Type    | Description
:---------------|:--------|:-----------
`data`          | Object  | Sensor status
&nbsp;&nbsp;&nbsp;&nbsp;`key`     | String  | Security key
&nbsp;&nbsp;&nbsp;&nbsp;`address` | String  | Source address

```javascript
{
  address: 'e50010012345',
  manufacturerId: '03da',
  sequence: 47803,
  type: 'commissioning',
  data: { key: '2358e2f4682e641a0000000000000000', address: 'e50010012345' },
  replayed: false
}
```

---------------------------------------
## <a id="Supported-EnOcean-BLE-devices">Supported EnOcean BLE devices</a>

For now, the EnOcean BLE devices which the node-enocean-ble supports are as follows:

Product Name | Manufacturer | Ordering Code
:------------|:-------------|:--------------
[PTM 215B](https://www.enocean.com/en/products/enocean_modules_24ghz_ble/ptm-215b/) | EnOcean | S3221-A215
[STM 550B Multisensor Module](https://www.enocean.com/en/products/enocean_modules_24ghz_ble/stm-550b-multisensor-module/) | EnOcean | S6221-K516
[Easyfit Single Rocker Wall Switch for BLE - EWSSB](https://www.enocean.com/en/products/enocean_modules_24ghz_ble/easyfit-single-double-rocker-wall-switch-for-ble-ewssb-ewsdb/) | EASYFIT | E8221-A270
[Easyfit Double Rocker Wall Switch for BLE - EWSDB](https://www.enocean.com/en/products/enocean_modules_24ghz_ble/easyfit-single-double-rocker-wall-switch-for-ble-ewssb-ewsdb/) | EASYFIT | E8221-A280
[Easyfit Single Rocker Pad for BLE - ESRPB](https://www.enocean.com/en/products/enocean_modules_24ghz_ble/easyfit-single-double-rocker-pad-for-ble-esrpb-edrpb/) | EASYFIT | ESRPB-W-EO
[Easyfit Double Rocker Pad for BLE - EDRPB](https://www.enocean.com/en/products/enocean_modules_24ghz_ble/easyfit-single-double-rocker-pad-for-ble-esrpb-edrpb/) | EASYFIT | EDRPB-W-EO
[IoT Multisensor - EMSIB](https://www.enocean.com/en/products/enocean_modules_24ghz_ble/iot-multisensor-emsib/) | EASYFIT | E6221-K516<br>B6221-K516

I actually tested only [STM 550B Multisensor Module](https://www.enocean.com/en/products/enocean_modules_24ghz_ble/stm-550b-multisensor-module/) (S6221-K516) and [Easyfit Double Rocker Wall Switch for BLE - EWSDB](https://www.enocean.com/en/products/enocean_modules_24ghz_ble/easyfit-single-double-rocker-wall-switch-for-ble-ewssb-ewsdb/) (E8221-A280). The others should work well with the node-enocean-ble because they use the same EnOcean BLE module as the two. If your device does not work well with the node-enocean-ble, let me know.

---------------------------------------
## <a id="Release-Note">Release Note</a>

* v0.0.2 (2020-09-29)
  * Added the replay detection in the commissioning telegram
* v0.0.1 (2020-09-29)
  * First public release

---------------------------------------
## <a id="References">References</a>

* [EnOcean BLE devices](https://www.enocean.com/en/products/enocean_modules_24ghz_ble/)
* [Wikipedia - CCM mode (Counter with CBC-MAC)](https://en.wikipedia.org/wiki/CCM_mode) 

---------------------------------------
## <a id="License">License</a>

The MIT License (MIT)

Copyright (c) 2020 Futomi Hatano

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
