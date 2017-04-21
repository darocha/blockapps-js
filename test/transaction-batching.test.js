process.on("unhandledRejection", console.error)

var chai = require("chai");
var chaiP = require("chai-as-promised");
chai.use(chaiP);
chai.should();

var Promise = require("bluebird");

var lib = require("..");
var apiURL = "http://localhost/strato-api";
lib.setProfile("strato-dev", apiURL);
var privkey = lib.ethbase.Crypto.PrivateKey.random();

var Account = lib.ethbase.Account;
var Transaction = lib.ethbase.Transaction;
var Solidity = lib.Solidity;
var routes = lib.routes;

describe("transaction batching and handlers:", function() {
  it("should run the faucet", function() {
    return lib.routes.faucet(privkey.toAddress()).should.be.fulfilled;
  })
  describe("handlers.enable: ", function() {
    it("transactions should return resolved value when false", function() {
      lib.handlers.enable = false;
      var tx1 = Transaction().send(privkey);
      var tx2 = tx1.then(function() {
        return Solidity("contract C{}").then(function(s) {
          return s.construct().callFrom(privkey);
        })
      });
      return Promise.join(tx1, tx2, function(tx1, tx2) {
        tx1.should.have.property("transactionHash");
        tx2.should.have.property("state");
      })
    })
    it("transactions should return transaction handlers when true", function () {
      lib.handlers.enable = true;
      return Transaction().send(privkey).should.eventually.have.property("txHash");
    })
  })
  describe("routes.submitTransactionList:", function() {
    var tx, txResponse;
    before(function() {
      lib.handlers.enable = true;
    })
    it("should send a list of transactions", function() {
      tx = Transaction({nonce: 0}).sign(privkey);
      txResponse = routes.submitTransactionList([tx]).get(0);
      return txResponse.should.be.fulfilled;
    })
    it("should have 'txHash' handler", function () {
      return txResponse.should.eventually.have.property("txHash").
        which.should.eventually.equal(tx.fullHash());
    })
    it("should have 'txResult' handler", function() {
      return txResponse.should.eventually.have.property("txResult").
        which.should.eventually.have.property("transactionHash");
    })
  })
  describe("Transaction.sendList:", function() {
    var tx, txResponse;
    before(function() {
      lib.handlers.enable = true;
    })
    it("should send a list of transactions", function() {
      tx = Transaction();
      txResponse = Transaction.sendList([tx], privkey).get(0);
      return txResponse.should.be.fulfilled;
    })
    it("should have 'txHash' handler", function () {
      return txResponse.should.eventually.have.property("txHash");
    })
    it("should have 'txResult' handler", function() {
      return txResponse.should.eventually.have.property("txResult").
        which.should.eventually.have.property("transactionHash");
    })
    it("should have 'senderBalance' handler", function () {
      var actualBalance = Account(privkey.toAddress()).balance;
      var hasSenderBalance = txResponse.should.eventually.have.property("senderBalance");
      return Promise.join(hasSenderBalance, actualBalance, function(senderBalance, actualBalance) {
        senderBalance.toString().should.equal(actualBalance.toString());
      })
    })
  })
  describe("Solidity.sendList:", function () {
    var constructTX, callTX;
    before(function() {
      lib.handlers.enable = true;
    })
    it("should send a list of transactions", function() {
      constructTX = Solidity("contract C{function f() returns (int) {return 1;}}").
        then(function(s) {
          return Solidity.sendList([s.construct()], privkey);
        }).
        get(0);
      callTX = constructTX.
        get("contract").
        then(function(c) {
          return Solidity.sendList([c.state.f()], privkey);
        }).
        get(0);
      return Promise.join(
        constructTX.should.be.fulfilled,
        callTX.should.be.fulfilled
      );
    })
    it("should have 'txHash' handler", function () {
      return Promise.join(
        constructTX.should.eventually.have.property("txHash"),
        callTX.should.eventually.have.property("txHash")
      );
    })
    it("should have 'txResult' handler", function() {
      return Promise.join(
        constructTX.should.eventually.have.property("txResult"),
        callTX.should.eventually.have.property("txResult")
      );
    })
    it("should have 'senderBalance' handler", function() {
      return Promise.join(
        constructTX.should.eventually.have.property("senderBalance"),
        callTX.should.eventually.have.property("senderBalance")
      );
    })
    it("for constructors, should have 'contract' handler", function() {
      return constructTX.should.eventually.have.property("contract").
        which.should.eventually.have.property("state");
    })
    it("for function calls, should have 'returnValue' handler", function() {
      var hasRetVal = callTX.should.eventually.have.property("returnValue");
      var retValIs = callTX.get("returnValue").call("toString").
        should.eventually.equal("1");
    })
  })
})
