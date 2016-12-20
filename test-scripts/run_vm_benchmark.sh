#!/bin/bash
./test-scripts/benchmark_vm.sh -b '100 500 1000 1500 2000 2500 2700 3000' -g 3000 -d 120 > raw_out
./test-scripts/vmstats.sh -i raw_out -o out
