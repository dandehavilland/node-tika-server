'use strict';
const RSVP = require('rsvp');
const exec = require('child_process').exec;
const fs = require('fs');
const net = require('net');

const SERVER_PORT = 9293;
const SERVER_HOST = 'localhost';
const MAX_RETRIES = 5;
const RETRY_WAIT = 2000;
const TIKA_BINARY = __dirname+ '/bin/tika-app-1.12.jar';

let openSockets = [];
let _tika;
function bootServer(callback) {
  if (!_tika) {
    _tika = exec('java -Djava.awt.headless=true -jar '+ TIKA_BINARY + ' --server --port '+SERVER_PORT+ ' -t', (error, result) => {
      console.log('Tika server terminated');
    });
  }
}

function killServer(callback) {
  console.log('killing tika server');
  openSockets.forEach((socket) => {
    socket.destroy();
  });
  _tika.kill();
}

function connect(callback) {
  bootServer();

  let retryTimeout = 1000;
  let retries = 0;
  let connected = false;

  function initialize() {
    let socket = new net.connect(SERVER_PORT, SERVER_HOST, () => {
      console.log('connected to server!');
      connected = true;
      callback(socket);
    });

    openSockets.push(socket);

    socket.on('error', (error) => {
      console.error('Could not connect, retrying...');
      setTimeout(() => {
        retries++;
        if (retries === MAX_RETRIES) {
          console.error('Could not connect after '+MAX_RETRIES+' retries.');
        } else {
          initialize(callback);
        }
      }, RETRY_WAIT);
    });
  }

  initialize();
}

module.exports.killServer = function(callback) {
  _tika.kill();
};

module.exports.getText = function (filePath) {
  return new RSVP.Promise((resolve, reject) => {
    connect((client) => {
      console.log('Processing document...');
      let output = '';
      let stderr = '';

      let readStream = fs.createReadStream(filePath);
      readStream.on('data', chunk => client.write(chunk));
      readStream.on('close', () => client.end());

      client.on('data', (data) => output += data);
      client.on('end', () => {
        console.log('Disconnected from server');
        resolve(output);
      });
      client.on('error', (error) => {
        console.log('Failed.');
        reject(error);
      });
    });
  });
};

