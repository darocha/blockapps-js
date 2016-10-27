var chai = require("chai");
var chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised)
chai.should()

var lib = require("..");
var apiURL = "http://40.84.53.181:3000"
lib.setProfile("strato-dev", apiURL);

lib.handlers.enable = true;

describe("transaction batching:", function() {
  describe("handlers:", function() {
    it("handlers.enable should control whether handlers are exposed", function() {

    });
    it("submitTransaction route should have txHash and txResult handlers", function() {
      var rawTX = `
{
  "nonce":"0",
  "gasPrice":"1",
  "gasLimit":"3141592",
  "to":"000000000000000000000000000000000000000a",
  "value":"0",
  "codeOrData":"",
  "from":"a72f95ee79cfa6005d0eb45fc496e3686cadd204",
  "r":"b6ba7f870bd9d5bc01af894d89b56e56b3e294f5cbff8c63bde3dfafd760c196",
  "s":"c19fe41be634a65c6db0f3c46a9a8431e01f262f7d66db64609eeaa87e920b56",
  "v":"1c",
  "hash":"9a6b7d7b916c5aaac798b66c2401880818457d83370f55fd15139d66974bdd73"
}
`
      return lib.routes.submitTransaction(rawTX).
        then(function(handlers) {
          var txHash = JSON.parse(rawTX).hash;
          handlers.txHash.should.eventually.equal(txHash);
          handlers.txResult.should.eventually.have.property("transactionHash", txHash);
        });
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
