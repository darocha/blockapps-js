// Sample contains a history of States until it splits to an array of new Samples
contract Sample {
    struct Sample {
        uint sampleType;
        uint parent;
        uint wellHead;
        uint boreHole;
        uint timestamp;
        uint[] depth;
        uint[] children;
    }

    // hash sample info (sans children)
    function hashSample(Sample s) internal returns(bytes32) {
        return sha3(s.sampleType, s.parent, s.wellHead, s.boreHole, s.timestamp, s.depth);
    }

    function deserializeSample(uint sampleType, uint parent, uint wellHead, uint boreHole, uint timestamp, uint[] depth, uint[] children) internal constant returns (Sample) {
        return Sample(sampleType, parent, wellHead, boreHole, timestamp, depth, children);
    }

    function serializeSample(Sample s) internal constant returns (uint sampleType, uint parent, uint wellHead, uint boreHole, uint[] depth, uint[] children){
        sampleType = s.sampleType;
        parent = s.parent;
        wellHead = s.wellHead;
        boreHole = s.boreHole;
        depth = s.depth;
        children = s.children;
    }

}
