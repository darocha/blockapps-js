# Strato performance tests

## Introduction

You can test the performance of your strato node using these scripts. After warmup, press `ctrl+\` to send a `SIGQUIT` signal to the script and it will display basic statistics of the throughput capabilities of the system.

## Options

You can specify the parameters on the commandline:
+ `size` (default: 100)
+ `gapMS` (default: 3000)
+ `strato` (default: `https://strato-scale3.blockapps.net`)
+ `blocURL` (default: `http://localhost:8000`)

## Scripts

### Send value tests

This script sends batches of transactions to the address `0xdeadbeef`.

Using `bloc`:
```sh
./test-scripts/send-load-bloc-test --size 100 --gapMS 3000 --blocURL "http://localhost:8000"
```

Using `blockapps-js`:
```sh
./test-scripts/send-load-nobloc-test --size 100 --gapMS 3000 --strato "http://localhost:3000"
```

### Complex contract interaction

This simulates interaction with a computationally intensive Solidity contract.

Using `bloc`:
```sh
./test-scripts/complex-contract-batch-load-test  --size 10  --strato "http://localhost:3000"
```

### Alex load test

Simulate multiple users and contract interactions.


Using `bloc`:

```sh
./test-scripts/alex-load-bloc-test --size 100 --gapMS 3000 --blocURL "http://localhost:8000"
```

Using `blockapps-js`:
```sh
./test-scripts/alex-load-nobloc-test --size 100 --gapMS 3000 --strato "http://localhost:3000"
```
