import "Owned.sol";
import "Sample.sol";
import "Samples.sol";

contract SampleManager is Owned, Sample {
    Samples public samples;

    function SampleManager() {
        samples = new Samples();
    }

    // todo: permissions
    function add(uint sampleType, uint parent, uint wellHead, uint boreHole, uint[] depth) returns (uint id) {
        return samples.add(sampleType, parent, wellHead, boreHole, depth);
    }

    function matchCount(uint sampleType, uint parent, uint wellHead, uint boreHole, uint timestamp) constant returns (uint) {
        uint length = samples.sampleCount();
        uint foundCount;
        for (uint i = 1; i < length; i++) {
            var (s_sampleType, s_parent, s_wellHead, s_boreHole, s_timestamp) = samples.data(i);

            if (
                (sampleType == 0 || s_sampleType == sampleType) &&
                (parent == 0 || s_parent == parent) &&
                (wellHead == 0 || s_wellHead == wellHead) &&
                (boreHole == 0 || s_boreHole == boreHole) &&
                (timestamp == 0 || s_timestamp == timestamp)
            ) {
                foundCount++;
            }
        }
        return foundCount;
    }

    // Return array of sample IDs for any samples matching at least one of the parameters
    function findSampleIDs(uint sampleType, uint parent, uint wellHead, uint boreHole, uint timestamp) constant returns (uint[] ids) {
        uint length = samples.sampleCount();
        uint[] memory found = new uint[](matchCount(sampleType, parent, wellHead, boreHole, timestamp));
        uint count;

        for (uint i = 1; i < length; i++) {
            var (s_sampleType, s_parent, s_wellHead, s_boreHole, s_timestamp) = samples.data(i);

            if (
                (sampleType == 0 || s_sampleType == sampleType) &&
                (parent == 0 || s_parent == parent) &&
                (wellHead == 0 || s_wellHead == wellHead) &&
                (boreHole == 0 || s_boreHole == boreHole) &&
                (timestamp == 0 || s_timestamp == timestamp)
            ) {
                found[count++] = i;
            }
        }

        return found;
    }

    function get() returns (uint) {
      return 42;
    }

    function get2() returns (uint){
      return samples.get2();
    }

    function get3(uint param) returns (uint){
      return samples.get3(param);
    }

    function get4(uint[] params) returns (uint){
      return samples.get4(params);
    }

    function get5(uint sampleType, uint parent, uint wellHead, uint boreHole, uint[] depth) returns (uint){
      return samples.get5(sampleType, parent, wellHead, boreHole, depth);
    }

    function get6(uint sampleType, uint parent, uint wellHead, uint boreHole, uint[] depth) returns (uint){
      return samples.get6(sampleType, parent, wellHead, boreHole, depth);
    }
}
