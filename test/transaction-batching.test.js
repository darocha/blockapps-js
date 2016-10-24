var chai = require("chai");
var chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised)
chai.should()

var apiURL = "https://ryan-build.blockapps.net/strato-api"

describe("transaction batching:", function() {
  describe("handlers:", function() {
    it("submitTransaction route should have txHash and txResult handlers", function() {
      var rawTX = `
{
      "nonce":"0",
      "gasPrice":"1",
      "gasLimit":"3141592",
      "to":"000000000000000000000000000000000000000a",
      "value":"0",
      "codeOrData":"",
      "from":"7bbb9f28cb562b1c99b86aee88290ebc70bd159a",
      "r":"4045970188d0724377e45a8174e066bcfa1e9c60b3c532923a3315c7c5476946",
      "s":"51ab5aec5229ed64fb12166c104519fa017231f4baf719b9fdd2b8c3c5b3b454",
      "v":"1b",
      "hash":"9a6b7d7b916c5aaac798b66c2401880818457d83370f55fd15139d66974bdd73"
}
`;

    });
    it("Transaction constructor should have txHash and txResult handlers", function() {

    });
    it("Solidity constructor should have txHash, txResult, and contract handlers", function() {

    });
    it("Solidity method calls should have txHash, txResult, and returnValue handlers", function() {

    });
  });
  describe("load tests:", function() {
    this.timeout(100000); // in milliseconds
    it("can batch 100 simple value transfers", function() {

    });
    it("can batch 100 contract creations with empty contracts", function() {

    });
    it("can batch 100 contract creations that set a state variable", function() {

    });
    it("can batch 100 method calls each performing a big loop", function() {

    });
  });
});
