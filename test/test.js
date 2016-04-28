'use strict';
const getText = require('../index').getText;

getText(__dirname + '/test.txt')
  .then((output) => {
    console.log(output);
  });
