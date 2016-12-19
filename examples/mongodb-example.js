'use strict';
/*jslint node: true */
/*jslint esversion: 6 */
const Machine = require('../knearest');
const chalk = require('chalk');

// Some data to get us going. It's important that your data is well-clustered,
// because statistical noise will render this algorithm less useful.
let machine= new Machine({
  k: 5,                                               // Optional. Defaults to 1.
  props: ['rooms', 'area', 'type'],                   // Required. This is the schema of your dataset. All nodes will be checked against this.
  nodes: [                                            // Required. There must be some data to seed the AI's knowledge
    { rooms: 1, area: 350, type: 'apartment' },
    { rooms: 2, area: 300, type: 'apartment' },
    { rooms: 3, area: 300, type: 'apartment' },
    { rooms: 4, area: 250, type: 'apartment' },
    { rooms: 4, area: 500, type: 'apartment' },
    { rooms: 4, area: 400, type: 'apartment' },
    { rooms: 5, area: 450, type: 'apartment' },
    { rooms: 7, area: 850, type: 'house' },
    { rooms: 7, area: 900, type: 'house' },
    { rooms: 7, area: 1200, type: 'house' },
    { rooms: 8, area: 1500, type: 'house' },
    { rooms: 9, area: 1300, type: 'house' },
    { rooms: 8, area: 1240, type: 'house' },
    { rooms: 10, area: 1700, type: 'house' },
    { rooms: 9, area: 1000, type: 'house' },
    { rooms: 1, area: 800, type: 'flat' },
    { rooms: 3, area: 900, type: 'flat' },
    { rooms: 2, area: 700, type: 'flat' },
    { rooms: 1, area: 900, type: 'flat' },
    { rooms: 2, area: 1150, type: 'flat' },
    { rooms: 1, area: 1000, type: 'flat' },
    { rooms: 2, area: 1200, type: 'flat' },
    { rooms: 1, area: 1300, type: 'flat' }
  ],
  data: {
    store: 'mongo',                                   // Optional. Defaults to 'memory'
    url: 'mongodb://localhost:27017/knearest'         // Required if store = 'mongo'
  },
  verbose: true,                                      // Optional. Toggle console output. Defaults to false
  stringAlgorithm: 'Levenshtein'                      // Optional. Defaults to 'Jaro-Winkler'
});

// knearest is also an EventEmitter.
// The below line will print to terminal each time a node is added.
machine.on('node', console.log);

// Let's add a new data point, this time without a "type".
// We want to guess the value of "type".
// .guess(property, node) returns a bluebird Promise.
machine.guess('type', {rooms: 12, area: 1375 })
  .then((result) => {
    console.log('Value of "' + result.feature + '" is probably ' + chalk.green(result.value) + ' ('+result.elapsed+'ms)');
    process.exit(0);
  });
