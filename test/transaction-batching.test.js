var chai = require("chai");
var chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised)
chai.should()


var Promise = require("bluebird");
var lib = require("..");
var apiURL = "https://ryan-build.blockapps.net/strato-api"
lib.setProfile("ethereum-frontier", apiURL);
lib.handlers.enable = true;

var privkey = lib.ethbase.Crypto.PrivateKey.random();
var faucet = lib.routes.faucet(privkey.toAddress());

describe("transaction batching:", function() {
  describe("handlers:", function() {
    this.timeout(60000);
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
          return tx0.call("callFrom", privkey).get("contract").get("state").call("f");
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
              which.should.eventually.equal(txHash),
            callMethod.should.eventually.have.property("returnValue"),
            callMethod.get("returnValue").call("toString").should.eventually.equal("1")
          ]);
        });

    });
  });
  describe("load tests:", function() {
    this.timeout(100000); // in milliseconds
    
    // txFn :: number -> transaction
    // setNonce :: tx -> number -> tx
    // sendFn :: transaction -> tx handlers
    function sendBatch(txFn, setNonce, sendFn) {
      var batch = [];
      for (i = 0; i < 100; ++i) {
        batch.push(txFn(i));
      }

      var head = batch.shift();
      return faucet.
        thenReturn(head).
        then(sendFn).
        thenReturn(head).
        get("nonce").
        then(function(nonce) {
          return Promise.mapSeries(batch, function(tx, i) {
            var tx2 = setNonce(tx, nonce.plus(i + 1));
            return sendFn(tx2);
          });
        });
    }

    it("can batch 100 simple value transfers", function() {
      function txFn(i) {
        return lib.ethbase.Transaction({value : i});
      }
      function setNonce(tx, n) {
        tx.nonce = n;
        return tx;
      }
      function sendFn(tx) {
        return tx.send(privkey);
      }
      return sendBatch(txFn, setNonce, sendFn);
    });
    it("can batch 100 contract creations with empty contracts", function() {
      function txFn(i) {
        return lib.Solidity("contract C{}").call("construct");
      }
      function setNonce(tx, n) {
        return tx.txParams({nonce: n});
      }
      function sendFn(tx) {
        return tx.callFrom(privkey);
      }
      return sendBatch(txFn, setNonce, sendFn);
    });
    it("can batch 100 contract creations that set a state variable", function() {
      function txFn(i) {
        return lib.Solidity("contract C{int x = " + i + ";}").call("construct");
      }
      function setNonce(tx, n) {
        return tx.txParams({nonce: n});
      }
      function sendFn(tx) {
        return tx.callFrom(privkey);
      }
      return sendBatch(txFn, setNonce, sendFn);
    });
    it("can batch 100 method calls each performing a big loop", function() {
      var createContract = lib.Solidity(`
contract C{
  int x = 2;
  function f() {
    for (int i = 0; i < 1000; ++i) {
      x = x*x;
    }
  }
}`      ).
        call("construct").
        call("callFrom", privkey).
        get("contract");
      function txFn(i) {
        return this.state.f();
      }
      function setNonce(tx, n) {
        return tx.txParams({nonce: n});
      }
      function sendFn(tx) {
        return tx.callFrom(privkey);
      }
      return createContract.then(function(contract) {
        return sendBatch(txFn.bind(contract), setNonce, sendFn);
      });
    });
  });
});
