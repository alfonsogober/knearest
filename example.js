/*jslint node: true */
/*jslint esversion: 6 */
const Machine = require('./knearest');

// Conversion function to output your numerical classifiers as text.
// This can be whatever you want it to be, as long as it's internally consistent.
// For our purposes, 1 = apartment, 2 = house, and 3 = flat.
const convert = (num) => {
  if (num === 1) return 'apartment';
  if (num === 2) return 'house';
  if (num === 3) return 'flat';
};

// Some data to get us going. It's important that your data is well-clustered,
// because statistical noise will render this algorithm less useful.
let machine = new Machine({
  k: 3,
  props: ['rooms', 'area', 'type'],
  nodes: [
    { rooms: 1, area: 350, type: 1 },
    { rooms: 2, area: 300, type: 1 },
    { rooms: 3, area: 300, type: 1 },
    { rooms: 4, area: 250, type: 1 },
    { rooms: 4, area: 500, type: 1 },
    { rooms: 4, area: 400, type: 1 },
    { rooms: 5, area: 450, type: 1 },
    { rooms: 7, area: 850, type: 2 },
    { rooms: 7, area: 900, type: 2 },
    { rooms: 7, area: 1200, type: 2 },
    { rooms: 8, area: 1500, type: 2 },
    { rooms: 9, area: 1300, type: 2 },
    { rooms: 8, area: 1240, type: 2 },
    { rooms: 10, area: 1700, type: 2 },
    { rooms: 9, area: 1000, type: 2 },
    { rooms: 1, area: 800, type: 3 },
    { rooms: 3, area: 900, type: 3 },
    { rooms: 2, area: 700, type: 3 },
    { rooms: 1, area: 900, type: 3 },
    { rooms: 2, area: 1150, type: 3 },
    { rooms: 1, area: 1000, type: 3 },
    { rooms: 2, area: 1200, type: 3 },
    { rooms: 1, area: 1300, type: 3 }
  ]
});

// knearest is also an EventEmitter.
machine.on('guessing', (data) => {
  console.log('Guessing property "' + data.feature + '" using k = '+ data.k);
});

// Let's add a new data point, this time without a "type".
// We want to guess the value of "type".
var unknown = {rooms: 12, area: 1375 };

// .guess(property, node) returns a bluebird Promise.
machine.guess('type', unknown)
  .then((result) => {
    console.log('Value of "' + result.feature + '" is probably "' + convert(result.value) + '" ('+result.elapsed+'ms)');
  });
