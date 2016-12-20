#!/usr/bin/python
import sys
import argparse
import numpy

__author__ = 'ilir@blockapps.net'

parser = argparse.ArgumentParser(description='Extracts stats from the send-nobloc-test output.')
parser.add_argument('-i','--input', help='Input file name',required=True)
parser.add_argument('-o','--output',help='Output file name', required=True)
args = parser.parse_args()

print ( "Input file: %s" % args.input )
print ( "Output file: %s" % args.output )

def chunk(l,n):
	return [l[i:i + n] for i in xrange(0, len(l), n)]

def colNames(captions):
	r = ['Batch']
	for c in captions:
		r.append(c + ' - MEAN')
		r.append(c + ' - STDEV')
	return r

def row(means, stdevs):
	r = []
	for z in zip(means, stdevs):
		r.append(z[0])
		r.append(z[1])
	return r

f = open(str(args.input))

lines = f.readlines()

f.close()

# Writing stats

batches = [x.split()[2] for x in filter(lambda x: x.startswith('batch'), lines)]
n = len(batches)
means = [x.split()[1] for x in filter(lambda x: x.startswith('mean'), lines)]
nrOfStats = len(means)
chunkSize = nrOfStats / n
cMeans = chunk(means, chunkSize) 

stdevs = [x.split()[1] for x in filter(lambda x: x.startswith('stdev'), lines)]
cStdevs = chunk(stdevs, chunkSize)


ff = open(str(args.output), 'w')

captions = [x.split('(ignoring')[0][1:-1] for x in filter(lambda x:x.startswith('-'), lines)][0:chunkSize]

cNames = ','.join(colNames(captions))
ff.write(cNames +'\n')

for i in xrange(n):
	ff.write(','.join([batches[i]] + row(cMeans[i], cStdevs[i])) +'\n')

# Writing summaries

cNames = ['Batches dispatched', 'Total transactions executed', 'Transactions executed per second', 'Time so far']

def summaryValues(idx, cNames, summaries):
	return  [x.split(cNames[idx])[1].split()[0] for x in filter(lambda x:x.startswith(cNames[idx]), summaries)]

summaries = [x.split('*')[1] for x in filter(lambda x:x.startswith('*'), lines)]

sRows = []
for i in range(len(cNames)):
	sRows.append(summaryValues(i, cNames, summaries))

t = numpy.array(sRows)
print (t)
t = t.transpose()
print (t)

ff.write('\n\n')
ff.write(','.join(cNames)+ '\n')

for i in range(t.shape[0]):
	ff.write(','.join(t[i])+'\n')

ff.close()
