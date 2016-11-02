# scaling performance tests

## examples

### Alex load test

Using `bloc`:

```sh
./alex-load-bloc-test --size 100 --gapMS 3000 --blocURL "http://localhost:8000"
```

Using `blockapps-js`:
```sh
./alex-load-nobloc-test --size 100 --gapMS 3000 --strato "http://localhost:3000"
```

### Send value tests

Using `bloc`:
```sh
./send-load-test --size 100 --gapMS 3000 --blocURL "http://localhost:8000"
```

### Complex contract interactions

Using `bloc`:
```sh
./complex-contract-batch-load-test  --size 10  --strato "http://40.84.53.181:3000"  --blocURL "http://localhost:8001"
```

Using `bloc`:
```sh
./send-batch-load-test   --size 10  --strato "http://40.84.53.181:3000"  --blocURL "http://localhost:8001"
```