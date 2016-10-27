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

describe("Send and resolve 10 transactions every 5 seconds", function() {
  this.timeout(0)
  for(j = 0;j < 20;++j) {
    it("Should send 10 transactions and resolve in 5 seconds", function() {
      this.timeout(6000)
      var txsDone = false;
      var nonceC;

      return lib.ethbase.Account(privkey.toAddress()).nonce.
        then(function(n) { nonceC = n; }).
        then(function() {
          var txList = []
          for (i = 0; i < 10; ++i) {
            var tx = lib.ethbase.Transaction({nonce: lib.ethbase.Int(nonceC + i)});
            tx.from = privkey.toAddress();
            txList.push(tx);
          }
          var sendTXs = Promise.
            mapSeries(txList, function(tx) {return tx.send(privkey)}).
            then(function() { txsDone = true; });
          return Promise.delay(5000).then(function() {return txsDone;});
        }).should.eventually.be.true;
    })
  }
})

