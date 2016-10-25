# Testing blockapps-js error

In the blockapps-js documentation at https://github.com/blockapps/blockapps-js/tree/120461499_import-syntax#compile-solidity-code
there is the example for compiling contracts with imports. For this test we ignore
the import aspect and focus on compiling a simple contract. The contract is in
`Migrations.sol`. The blockapps-js code is modeled off of the following:

```javascript
var Solidity = require('blockapps-js').Solidity;

Solidity({
  main: {
    "Derived.sol": undefined
  },
  import: {
    "Base.sol": undefined
  },
}).get("Derived").get("C").then(function(solObj) {
  // Use the solObj as above
});
```

Instead of `Derived.sol` we use `Migrations.sol` and import is empty.

```javascript
var lib = require('./blockapps-js/index.js'),
  Solidity = lib.Solidity;
lib.setProfile('strato-dev', 'http://branch-120461499.centralus.cloudapp.azure.com', '1.2');

Solidity({
  main: {
    "Migrations.sol":undefined
  },
  import: {
  },
}).get("Migrations").get("Migrations").then(function(solObj) {
  // Use the solObj as above
  console.log('solObj: ',solObj);
});
```

Here is the error that occurs when running the above code:

```
Unhandled rejection TypeError: Cannot read property 'Migrations' of undefined
    at String.eval (eval at <anonymous> (/Users/charlescrain/dev/blockapps/solidity_bhp_fix/simpleUploadTest/blockapps-js/node_modules/bluebird/js/main/call_get.js:36:12), <anonymous>:5:19)
    at String.tryCatcher (/Users/charlescrain/dev/blockapps/solidity_bhp_fix/simpleUploadTest/blockapps-js/node_modules/bluebird/js/main/util.js:26:23)
    at Promise._settlePromiseFromHandler (/Users/charlescrain/dev/blockapps/solidity_bhp_fix/simpleUploadTest/blockapps-js/node_modules/bluebird/js/main/promise.js:507:31)
    at Promise._settlePromiseAt (/Users/charlescrain/dev/blockapps/solidity_bhp_fix/simpleUploadTest/blockapps-js/node_modules/bluebird/js/main/promise.js:581:18)
    at Promise._settlePromises (/Users/charlescrain/dev/blockapps/solidity_bhp_fix/simpleUploadTest/blockapps-js/node_modules/bluebird/js/main/promise.js:697:14)
    at Async._drainQueue (/Users/charlescrain/dev/blockapps/solidity_bhp_fix/simpleUploadTest/blockapps-js/node_modules/bluebird/js/main/async.js:123:16)
    at Async._drainQueues (/Users/charlescrain/dev/blockapps/solidity_bhp_fix/simpleUploadTest/blockapps-js/node_modules/bluebird/js/main/async.js:133:10)
    at Immediate.Async.drainQueues [as _onImmediate] (/Users/charlescrain/dev/blockapps/solidity_bhp_fix/simpleUploadTest/blockapps-js/node_modules/bluebird/js/main/async.js:15:14)
    at tryOnImmediate (timers.js:543:15)
    at processImmediate [as _immediateCallback] (timers.js:523:5)
  ```

To duplicate this error do the following:
* clone this branch and copy `Migrations.sol` and `tests.js` to a new directory.
* In the new directory, clone `blockapps-js` develop branch with `git clone -b develop https://github.com/blockapps/blockapps-js.git`
* `cd blockapps-js && npm i`
* `cd .. && node tests.js`
