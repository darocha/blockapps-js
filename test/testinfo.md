# Test Info:

## Situation:
When testing SampleManager contract in testUpload.js we get inconsistent results.
Sometimes the call to test function `get5` on SampleManager works and returns the
bignumber result of 37. Sometimes it would error:
```JSON
Unhandled rejection Error: Int: Invalid hex integer:
  at Object.ensureErrorObject (/Users/charlescrain/dev/blockapps/solidity_epic/merging/blockapps-js/node_modules/bluebird/js/main/util.js:261:20)
  at Promise._rejectCallback (/Users/charlescrain/dev/blockapps/solidity_epic/merging/blockapps-js/node_modules/bluebird/js/main/promise.js:469:22)
  at Promise._settlePromiseFromHandler (/Users/charlescrain/dev/blockapps/solidity_epic/merging/blockapps-js/node_modules/bluebird/js/main/promise.js:513:17)
  at Promise._settlePromiseAt (/Users/charlescrain/dev/blockapps/solidity_epic/merging/blockapps-js/node_modules/bluebird/js/main/promise.js:581:18)
  at Promise._settlePromises (/Users/charlescrain/dev/blockapps/solidity_epic/merging/blockapps-js/node_modules/bluebird/js/main/promise.js:697:14)
  at Async._drainQueue (/Users/charlescrain/dev/blockapps/solidity_epic/merging/blockapps-js/node_modules/bluebird/js/main/async.js:123:16)
  at Async._drainQueues (/Users/charlescrain/dev/blockapps/solidity_epic/merging/blockapps-js/node_modules/bluebird/js/main/async.js:133:10)
  at Immediate.Async.drainQueues [as _onImmediate] (/Users/charlescrain/dev/blockapps/solidity_epic/merging/blockapps-js/node_modules/bluebird/js/main/async.js:15:14)
  at tryOnImmediate (timers.js:543:15)
  at processImmediate [as _immediateCallback] (timers.js:523:5)
```

## Run Test:

* clone the repo `git clone -b 120461499_import-syntax https://github.com/blockapps/blockapps-js.git`
* `cd blockapps-js && npm i`
* `cd test`
* `node testUpload.js`

## Thoughts

Lior and I (Charlie) debugged for about an hour on these contracts. We attempted to call the `add` function on SampleManager. That not working caused to us to create simple functions that progressively became more complex and similar to `add`. at `get5` we stopped because after running the function 7 times, it succeeded 4 times and failed 3 times. If you have any questions please let me (Charlie) know in slack.
