'use strict';
const tika = require('../index');

tika.getText(__dirname + '/test.txt')
  .then((output) => {
    console.log(output);
    tika.killServer();
  });
