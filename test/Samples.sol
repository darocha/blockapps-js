import "Sample.sol";
import "Simple.sol";
import "Owned.sol";

// collection of data
contract Samples is Owned, Sample {
    Sample[] public data;                // all owned original samples

    function Samples() {
        data.length = 1;
        Simple s = new Simple();
    }

    // todo: permissions
    function add(uint sampleType, uint parent, uint wellHead, uint boreHole, uint[] depth) isOwned returns (uint sampleId) {
        uint[] memory tmp;
        Sample memory s = Sample(sampleType, parent, wellHead, boreHole, now, depth, tmp);

        sampleId = data.length;
        if (parent > 0) data[parent].children.push(sampleId);
        data.push(s);
        return sampleId;
    }

    function edit(uint sampleId, uint sampleType, uint parent, uint wellHead, uint boreHole, uint timestamp, uint[] children, uint[] depths) returns(bytes32 sHash) {
        Sample memory next = Sample(sampleType, parent, wellHead, boreHole, timestamp, children, depths);
        data[sampleId] = next;
        sHash = hashSample(next);
    }

    // custom getter to include children[] and depth[] information
    function get(uint id) constant returns (uint, uint, uint, uint, uint, uint[], uint[]) {
        Sample memory s = data[id];
        return (s.sampleType, s.parent, s.wellHead, s.boreHole, s.timestamp, s.depth, s.children);
    }

    // custom getter for arrays of ids
    // the depth and children arrays for each sample are concatenated after prepending each with its length
    /*
    function get(uint[] ids) constant returns (uint[] sIds, uint[] sampleTypes, uint[] wellHeads, uint[] boreHoles, uint[] timestamps, uint[] depths, uint[] childrens) {
        Sample memory s;

        for (uint i = 0; i < ids.length; i++) {
            s = Sample(ids[i]);
            sIds.push(ids[i]);
            sampleTypes.push(s.sampleType);
            wellHeads.push(s.wellHead);
            boreHoles.push(s.boreHole);
            timestamps.push(s.timestamp);

            depths.push(s.depth.length);
            for (var j = 0; j < s.depth.length; j++) {
                depths.push(s.depth[j]);
            }

            childrens.push(s.children.length);
            for (var k = 0; k < s.children.length; k++) {
                childrens.push(s.children[k]);
            }
        }
    }
    */

    function hashSample(uint id) constant returns (bytes32) {
        return hashSample(data[id]);
    }

    function sampleCount() constant returns (uint) {
        return data.length;
    }

    function test(uint[] i) returns (uint[]) {
        return i;
    }

    function get2() returns (uint){
      return 37;
    }

    function get3(uint param) returns (uint){
      return param;
    }

    function get4(uint[] params) returns (uint){
      return 8;
    }

    function get5(uint sampleType, uint parent, uint wellHead, uint boreHole, uint[] depth) isOwned returns (uint){
      return 37;
    }

    function get6(uint sampleType, uint parent, uint wellHead, uint boreHole, uint[] depth) isOwned returns (uint){
//      Sample memory s = Sample(sampleType, parent, wellHead, boreHole, now, depth, tmp);
      Simple s = new Simple();
      return 6;
    }


}
