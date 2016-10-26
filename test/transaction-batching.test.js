var chai = require("chai");
var chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised)
chai.should()

var Promise = require("bluebird");
var lib = require("..");
var apiURL = "https://ryan-build.blockapps.net/strato-api"
lib.setProfile("strato-dev", apiURL);

lib.handlers.enable = true;

var privkey = lib.ethbase.Crypto.PrivateKey.random();
var faucet = lib.routes.faucet(privkey.toAddress());

describe("transaction batching:", function() {
  describe("handlers:", function() {
    it("submitTransaction route should have txHash and txResult handlers", function() {
      var rawTX = lib.ethbase.Transaction({nonce:0});
      rawTX.from = privkey.toAddress();
      var submitTX = faucet.
        then(function() {
          rawTX.sign(privkey);
          return lib.routes.submitTransaction(rawTX);
        });

      return submitTX.
        then(function() { return rawTX.fullHash();}).
        then(function(txHash) {
          return Promise.all([
            submitTX.should.eventually.have.property("txHash").
              which.should.eventually.equal(txHash),
            submitTX.should.eventually.have.property("txResult").
              which.should.eventually.have.property("transactionHash").
              which.should.eventually.equal(txHash)
          ]);
        });
    });
    it("Transaction constructor should have txHash and txResult handlers", function() {
      var tx = lib.ethbase.Transaction();
      var sendTransaction = faucet.
        then(function() {
          return tx.send(privkey);
        });

      return sendTransaction.
        then(function() { return tx.fullHash();}).
        then(function(txHash) {
          return Promise.all([
            sendTransaction.should.eventually.have.property("txHash").
              which.should.eventually.equal(txHash),
            sendTransaction.should.eventually.have.property("txResult").
              which.should.eventually.have.property("transactionHash").
              which.should.eventually.equal(txHash)
          ]);
        });
    });
    it("Solidity constructor should have txHash, txResult, and contract handlers", function() {
      var tx = lib.Solidity("contract C{}").call("construct");
      var makeContract = faucet.
        then(function() {
          return tx.call("callFrom", privkey);
        });

      return makeContract.
        thenReturn(tx).
        then(function(tx) { return tx.fullHash();}).
        then(function(txHash) {
          return Promise.all([
            makeContract.should.eventually.have.property("txHash").
              which.should.eventually.equal(txHash),
            makeContract.should.eventually.have.property("txResult").
              which.should.eventually.have.property("transactionHash").
              which.should.eventually.equal(txHash),
            makeContract.should.eventually.have.property("contract").
              which.should.eventually.have.property("state")
          ]);
        });
    });
    it("Solidity method calls should have txHash, txResult, and returnValue handlers", function() {
      var tx0 = lib.Solidity("contract C{function f() returns (int) {return 1;}}").call("construct");
      var tx = faucet.
        then(function() {
          return tx.call("callFrom", privkey).get("state").call("f");
        });
      var callMethod = tx.
        then(function() {
          return tx.call("callFrom", privkey);
        })

      return callMethod.
        thenReturn(tx).
        then(function(tx) { return tx.fullHash();}).
        then(function(txHash) {
          return Promise.all([
            callMethod.should.eventually.have.property("txHash").
              which.should.eventually.equal(txHash),
            callMethod.should.eventually.have.property("txResult").
              which.should.eventually.have.property("transactionHash").
              which.should.eventually.equal(txHash)
          ]);
        });

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
