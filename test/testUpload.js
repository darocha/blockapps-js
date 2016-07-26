var lib = require('../index.js'),
  Solidity = lib.Solidity,
  fs = require('fs');
  lib.setProfile('strato-dev', 'http://localhost', '1.2');

// None of these functions use the blockchain; it's all just local crypto.
var PrivateKey = lib.ethbase.Crypto.PrivateKey;
var pkey = PrivateKey.random();
var mnemonic = pkey.toMnemonic();

var addr = pkey.toAddress();

// Now you can use this address/key with the blockchain functions as above
var faucet = lib.routes.faucet;
var Account = lib.ethbase.Account;
var Transaction = lib.ethbase.Transaction;
var Units = lib.ethbase.Units;

faucet(addr).get("address").then(Account).get("balance").
then(function(balance) {
  // Units.convertEth(balance).from("wei").to("ether").toString() === "1000"
  console.log(balance);
  Solidity({
    main: {
      "SampleManager.sol":undefined
    },
    import: {
      // "./ts/Document.sol":undefined,
      // "./ts/Kook.sol":undefined
    },
  }).get("SampleManager.sol").get("SampleManager").then(function(solObj) {
    // Use the solObj as above
    // console.log('solObj: ========================',solObj);
    console.log(solObj);
    return solObj.construct().txParams({"value": 100}).callFrom(pkey);
  }).then(function(contract){
    console.log(contract)
    // contract.state.add(1,2,3,4,[7,8]).callFrom(pkey).then(function(reply){
    //   console.log(reply)
    // });
    contract.state.get6(1,2,3,4,[7,8]).callFrom(pkey).then(function(reply){
      console.log(reply);
    });
  });
});
