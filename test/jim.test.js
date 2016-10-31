var chai = require("chai")
var chaiAsPromised = require("chai-as-promised")
chai.use(chaiAsPromised)
chai.should()

var Promise = require("bluebird")
var lib = require("..")
lib.handlers.enable = true
lib.setProfile("ethereum-frontier", "https://strato-scale1.blockapps.net/strato-api")

var privkey = lib.ethbase.Crypto.PrivateKey.random()
var faucet = lib.routes.faucet(privkey.toAddress())

describe("Send transaction batches in a fixed interval", function() {
  this.timeout(0)
  for(j = 0;j < 20;++j) {
    it("Should send 20 transactions and finish in 2 seconds", function() {
      var txsDone = false;
      var nonceC;

      return lib.ethbase.Account(privkey.toAddress()).nonce.
        then(function(n) { nonceC = n; }).
        then(function() {
          var txList = []
          for (i = 0; i < 20; ++i) {
            var tx = lib.ethbase.Transaction({nonce: lib.ethbase.Int(nonceC + i)});
            tx.from = privkey.toAddress();
            tx.sign(privkey);
            txList.push(tx);
          }
          var sendTXs = lib.routes.submitTransactionList(txList).
            then(function() { txsDone = true; });
          return Promise.delay(20000).then(function() {return txsDone;});
        }).should.eventually.be.true;
    })
  }
})

