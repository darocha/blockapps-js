usage()   { echo "Usage: $0 -b '<series_of_batch_sizes>' -g <gap_between_batches_in_millisec> -d <total_duration_in_sec>" 1>&2;
            echo "e.g.: $0 -b '100 500 1000' -g 3000 -d 120" 1>&2; exit 1; }

while getopts ":b:g:d:h:" o; do
    case "${o}" in
        b)  b=${OPTARG} ;;
        g)  g=${OPTARG} ;;
        d)  d=${OPTARG} ;;
        h)  usage ;;
        *)  usage ;;
    esac
done

echo "b = ${b}"
echo "g = ${g}"
echo "d = ${d}"

for s in ${b}
do
        echo "running with --size $s --gapMS ${g} --d ${d}";
	nodejs ./test-scripts/send-load-nobloc-test --size $s --gapMS ${g} --duration ${d} --verbose false
done
