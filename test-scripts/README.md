# Strato performance tests

## Introduction

You can test the performance of your strato node using these scripts. After warmup, press `ctrl+\` to send a `SIGQUIT` signal to the script and it will display basic statistics of the throughput capabilities of the system.

## Scripts

This script sends batches of transactions to the address `0xdeadbeef`.

### Send value tests

Using `bloc`:
```sh
./send-load-test --size 100 --gapMS 3000 --blocURL "http://localhost:8000"
```

### Complex contract interaction

This simulates interaction with a computationally intensive Solidity contract.

Using `bloc`:
```sh
./complex-contract-batch-load-test  --size 10  --strato "http://40.84.53.181:3000"  --blocURL "http://localhost:8001"
```

### Alex load test

Simulate multiple users and contract interactions.

Using `bloc`:

```sh
./alex-load-bloc-test --size 100 --gapMS 3000 --blocURL "http://localhost:8000"
```

Using `blockapps-js`:
```sh
./alex-load-nobloc-test --size 100 --gapMS 3000 --strato "http://localhost:3000"
```
