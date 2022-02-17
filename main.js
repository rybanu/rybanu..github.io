// Получение ссылок на элементы UI
let connectButton = document.getElementById('connect');
let disconnectButton = document.getElementById('disconnect');
let terminalContainer = document.getElementById('terminal');
let sendForm = document.getElementById('send-form');
let inputField = document.getElementById('input');
let inputField1 = document.getElementById('input_angl');
let inputField2 = document.getElementById('subject');
let counter=0;
let summa='';
// Подключение к устройству при нажатии на кнопку Connect
connectButton.addEventListener('click', function() {
  connect();
});

// Отключение от устройства при нажатии на кнопку Disconnect
disconnectButton.addEventListener('click', function() {
  disconnect();
});

// Обработка события отправки формы
sendForm.addEventListener('submit', function(event) {
  event.preventDefault(); // Предотвратить отправку формы
  send(inputField.value); // Отправить содержимое текстового поля
  inputField.value = '';  // Обнулить текстовое поле
  inputField.focus();     // Вернуть фокус на текстовое поле
//counter+=1;
//log(counter+'string');
//inputField1.value = counter;
//inputField2.append(counter+'string'+'\n');

});

// Кэш объекта выбранного устройства
let deviceCache = null;
// Запустить выбор Bluetooth устройства и подключиться к выбранному
function connect() {
  return (deviceCache ? Promise.resolve(deviceCache) :
      requestBluetoothDevice()).
      then(device => connectDeviceAndCacheCharacteristic(device)).
      then(characteristic => startNotifications(characteristic)).
      catch(error => log(error));
}
///////////////////////////////////////////////////////////////////////////////////////////////////////
// Запрос выбора Bluetooth устройства
function requestBluetoothDevice() {
  log('Requesting bluetooth device...');

  return navigator.bluetooth.requestDevice({
    filters: [{namePrefix: 'HC-08'}],
  optionalServices: ['0000ffe0-0000-1000-8000-00805f9b34fb']
   // filters: [name: 'HC-08'],//   0000ffe0-0000-1000-8000-00805f9b34fb     0xFFE0
    // acceptAllDevices: true,////////////////////////////test//////
  }).
      then(device => {
        log('"' + device.name + '" bluetooth device selected');
        deviceCache = device;

        // Добавленная строка
        deviceCache.addEventListener('gattserverdisconnected',
            handleDisconnection);

        return deviceCache;
      });
}

// Обработчик разъединения
function handleDisconnection(event) {
  let device = event.target;

  log('"' + device.name +
      '" bluetooth device disconnected, trying to reconnect...');

  connectDeviceAndCacheCharacteristic(device).
      then(characteristic => startNotifications(characteristic)).
      catch(error => log(error));
}

/////////////////////////////
// Кэш объекта характеристики
let characteristicCache = null;

// Подключение к определенному устройству, получение сервиса и характеристики
function connectDeviceAndCacheCharacteristic(device) {
  if (device.gatt.connected && characteristicCache) {
    return Promise.resolve(characteristicCache);
  }

  log('Connecting to GATT server...');

  return device.gatt.connect().
      then(server => {
        log('GATT server connected, getting service...');

        return server.getPrimaryService('0000ffe0-0000-1000-8000-00805f9b34fb');///////////     0xFFE0
      }).
      then(service => {
        log('Service found, getting characteristic...');

        return service.getCharacteristic('0000ffe1-0000-1000-8000-00805f9b34fb');  /////// 0xFFE1
      }).
      then(characteristic => {
        log('Characteristic found');
        characteristicCache = characteristic;

        return characteristicCache;
      });
}
//////////////////////////////////////
// Включение получения уведомлений об изменении характеристики
function startNotifications(characteristic) {
  log('Starting notifications...');

  return characteristic.startNotifications().
      then(() => {
        log('Notifications started');
        // Добавленная строка
        characteristic.addEventListener('characteristicvaluechanged',
            handleCharacteristicValueChanged);
      });
}
/////////////////////////////////////////////
// Промежуточный буфер для входящих данных
let readBuffer = '';

// Получение данных
function handleCharacteristicValueChanged(event) {
  let value = new TextDecoder().decode(event.target.value);

  for (let c of value) {
    if (c === '\n') {
      let data = readBuffer.trim();
      readBuffer = '';

      if (data) {
        receive(data);
      }
    }
    else {
      readBuffer += c;
    }
  }
}

// Обработка полученных данных
function receive(data) {
 
 // log(data, 'in'); //add to log...
  // split/join  string
  var arrayOfStrings = data.split(';');
 var result = (arrayOfStrings[0] << 8) | arrayOfStrings[1];
  //inputField1.value=arrayOfStrings[1];
  inputField1.value=result;
  //inputField1.value = counter;
  counter+=1;
  if (counter>100)
  {
    inputField2.value =data;
    counter=0;
  }
  inputField2.append(data+'\n');
}

// Отправить данные подключенному устройству
// Отправить данные подключенному устройству
function send(data) {
  data = String(data);

  if (!data || !characteristicCache) {
    return;
  }
  //writeToCharacteristic(characteristicCache, data);
 // log(data, 'out');

  data += '\n';

  if (data.length > 20) {
    let chunks = data.match(/(.|[\r\n]){1,20}/g);

    writeToCharacteristic(characteristicCache, chunks[0]);

    for (let i = 1; i < chunks.length; i++) {
      setTimeout(() => {
        writeToCharacteristic(characteristicCache, chunks[i]);
      }, i * 100);
    }
  }
  else {
    writeToCharacteristic(characteristicCache, data);
  }

  log(data, 'out');

}

// Записать значение в характеристику
function writeToCharacteristic(characteristic, data) {
  characteristic.writeValue(new TextEncoder().encode(data));
}

// Вывод в терминал
function log(data, type = '') {
  terminalContainer.insertAdjacentHTML('beforeend',
      '<div' + (type ? ' class="' + type + '"' : '') + '>' + data + '</div>');
}
/////////////////////////////////////////////////
// Отключиться от подключенного устройства
// Отключиться от подключенного устройства
function disconnect() {
  if (deviceCache) {
    log('Disconnecting from "' + deviceCache.name + '" bluetooth device...');
    deviceCache.removeEventListener('gattserverdisconnected',
        handleDisconnection);

    if (deviceCache.gatt.connected) {
      deviceCache.gatt.disconnect();
      log('"' + deviceCache.name + '" bluetooth device disconnected');
    }
    else {
      log('"' + deviceCache.name +
          '" bluetooth device is already disconnected');
    }
  }

  // Добавленное условие
  if (characteristicCache) {
    characteristicCache.removeEventListener('characteristicvaluechanged',
        handleCharacteristicValueChanged);
    characteristicCache = null;
  }

  deviceCache = null;
}
