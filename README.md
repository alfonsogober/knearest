# K-Nearest

A Javascript implementation of the k-Nearest-Neighbor machine-learning algorithm.

## How To Use

```
npm install knearest
```

```Javascript

const Machine = require('knearest');

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

```

## Docs

### Methods

#### `new Machine(<Object> options)`
Create an instance using `options` object.

`options` expects the following structure:

```Javascript
{
  k: <Number> // The value of k, i.e. how many nearest neighbors to guess with.
  props: <Array> // The features to be used in the algorithm. These must correspond to your dataset.
  nodes: <Array> // The dataset to train with. These must have a consistent structure.
}
```

#### `Machine.guess(<String> type, <Object> data)`
Guess the value of `type` on `data`, based on the nodes supplied to the constructor. Depending on the size of the dataset, this may take some time.

### Events

`'node'`: Fired when a node is added to the dataset. Data structure: `{ id: <String>, features: <Object> }`.  

`'guessing'`: Fired immediately when .guess() is called. Data structure: `{ feature: <String>, k: <Number> }`.  

`'guess'`: Fired when a guess is complete. Data structure: `{ elapsed: <Number>, feature: <String>, value: <Number> }`.

`'ranges'`: Fired when new ranges are calculated. Data structure: `{ <String>: { min: <Number>, max: <Number>, range: <Number> }, ...}`.  

`'distance'`: Fired when a new distance is calculated on a node. Data structure: `{ parent: <String>, child: <String>, distance: <Number> }`.
