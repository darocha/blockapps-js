#!/usr/bin/python
#-----------------------
# prerequisite: rebuild with strato-api debug flag set to true
# input file:
# grep 'Timings in nanoseconds\:' strato-api | grep -oP '\[\K[^\]]+' | grep -vwE "Debug" > strato-api-timing
# out file: stats in csv format
# ----------------------

import sys
import numpy as np

import argparse
__author__ = 'ilir@blockapps.net'
 
parser = argparse.ArgumentParser(description='Calculates stats from a comma-separated csv-ish input file.')
parser.add_argument('-i','--input', help='Input file name',required=True)
parser.add_argument('-o','--output',help='Output file name', required=True)
args = parser.parse_args()
 
print ( "Input file: %s" % args.input )
print ( "Output file: %s" % args.output )

a = np.genfromtxt(str(args.input), delimiter=',')

# add insertion time col

ncols = a.shape[1]
c1 = a[:,ncols-2:ncols-1] # col before last one
c2 = a[:,ncols-1:ncols]   # last col
nc = c1 - c2

a = np.hstack((a,nc))

means = np.mean(a, axis=0)
stds = np.std(a, axis=0)

colNames =('Calc', 'Header parse time', 'Parse JSON', 'RawTx to Tx time', 'Transmission time',	'Ecrecover time', 'Insertion time')

assert len(colNames) == 7

print (colNames)

print ("means: {m}".format(m=means))
print ("stds:  {s}".format(s=stds))

o = open(str(args.output), 'w')
o.write(','.join(colNames) + '\n')
o.write(','.join(['mean'] + [str(x) for x in means]) + '\n')
o.write(','.join(['std'] + [str(x) for x in stds]) + '\n')
o.close()




 

