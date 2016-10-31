var HTTPQuery = require("../HTTPQuery.js");
var Promise = require('bluebird');
var Address = require("../Address.js");
var pollPromise = require("./pollPromise.js");
var errors = require("../errors.js");
var accountAddress = require("./db.js").accountAddress;
var handlers = require("../handlers.js");

function faucet(address) {
    var addr;
    try {
        addr = Address(address).toString();
    }
    catch(e) {
        errors.pushTag("faucet")(e);
    }
    return HTTPQuery("/faucet", {"post": {"address" : addr}}).
        then(pollPromise.bind(null, accountAddress.bind(null, addr))).
        catch(Promise.TimeoutError, function(e) {
            throw new Error(
                "waited " + pollPromise.defaults.pollTimeoutMS / 1000 + " seconds"
            );
        }).
        tagExcepts("faucet");
}

function submitTransaction(txObj) {
  function setTXHashHandler(txHash) { return { txHash: Promise.resolve(txHash) }; }
  function setTXResultHandler(txHandlers) {
      return txBasicHandler(txHandlers);
  }

  var result = 
    HTTPQuery("/transaction", {"data":txObj}).
    then(setTXHashHandler).
    then(setTXResultHandler).
    tagExcepts("submitTransaction");
  return handlers.enable ? result : result.get("txResult");
}

function txBasicHandler(txHandlers) { 
    txHandlers.txResult = 
      txHandlers.txHash.
      then(function(txHash) { return pollPromise(transactionResult.bind(null, txHash)); }).
      catch(Promise.TimeoutError, function() {
          throw new Error(
              "waited " + pollPromise.defaults.pollTimeoutMS / 1000 + " seconds"
          );
      }).
      tagExcepts("txResult handler");
    return txHandlers;
}

function submitContractCreateList(contractList, from, privkey){

    var Account = require("../Account.js");
    var Address = require("../Address.js");
    var Int = require("../Int.js");
    var Transaction = require("../Transaction.js");
    var Solidity = require("../Solidity.js");

    return Account(from).nonce
    .then(function(n) {

        var txs = contractList.map(function(c, i){
            var contractJson = c.contractJson;
            var name = c.contractName;
            var args = c.args;
            var txParams = c.txParams || {};
            console.log("trying contract " + name + " with args " + JSON.stringify(args))
            console.log("bajs: prvikey: " + privkey) 

            var solObj = Solidity.attach(contractJson);

            var toret;
            if (args.constructor === Object) {
              console.log("calling constructor")
              toret = solObj.construct(args);
            } else {
              console.log("calling constructor(2)")
              toret = solObj.construct.apply(solObj, args);
            }

            toret.txParams(txParams);
            toret.nonce = Int(n+i);
            toret.from = Address(from);
            toret.sign(privkey);

            return toret;
        })

        console.log("Submitting txs for submitContractCreateList: " + JSON.stringify(txs))
        return submitTransactionList(txs);
    });

}

function submitSendList(toValList, from, privkey){

    var Account = require("../Account.js");
    var Address = require("../Address.js");
    var Int = require("../Int.js");
    var Transaction = require("../Transaction.js");

    return Account(from).nonce
    .then(function(n) {
        console.log("Setting nonce to " + n)
        console.log("basj: prvikey: " + privkey) 

        var txs = toValList.map(function(x, i) {
            console.log(from + ": " + x.value + " --> " + x.toAddress)
            var valueTX = Transaction({"nonce": Int(n+i),
                                       "value" : x.value, 
                                       "gasLimit" : Int(21000),
                                       "gasPrice" : Int(50000000000),
                                       "to": x.toAddress
                                     });

            valueTX.from = Address(from);
            valueTX.sign(privkey);

            return valueTX;
        })

        console.log("Submitting txs for submitSendList: " + JSON.stringify(txs))
        return submitTransactionList(txs);
    });
}

function submitTransactionList(txObjList) {
  function setTXHashHandler(txHashList) { 
    return txHashList.map(function(txHash) { 
      return {txHash: Promise.resolve(txHash)}
    });
  }
  function setTXResultHandler(txHandlerList) {
      return txHandlerList.map(txBasicHandler);
  }

  var result = 
    HTTPQuery("/transactionList", {"data":txObjList}).
    then(setTXHashHandler).
    then(setTXResultHandler).
    tagExcepts("submitTransactionList");
  return handlers.enable ? result : result.get("txResult");
}

function transaction(transactionQueryObj) {
    try {
        if (typeof transactionQueryObj !== "object") {
            throw new Error(
                "transactionQueryObj must be a dictionary of query parameters"
            );
        }
    }
    catch(e) {
        errors.pushTag("transaction")(e);
    }
    return HTTPQuery("/transaction", {"get": transactionQueryObj}).
        then(function(txs) {
            if (txs.length === 0) {
                throw errors.tagError(
                    "NotDone",
                    "Query did not match any transactions"
                );
            }
            else {
                return txs;
            }
        }).
        tagExcepts("transaction");
}

function transactionLast(n) {
    try {
        n = Math.ceil(n);
        if (n <= 0) {
            throw new Error("transactionLast", "n must be positive");
        }
    }
    catch(e) {
        errors.pushTag("transactionLast")(e);
    }
    return HTTPQuery("/transaction/last/" + n, {"get":{}}).
        tagExcepts("transactionLast");
}

function transactionResult(txHash) {
    try {
        if (typeof txHash !== "string" || !txHash.match(/^[0-9a-fA-F]*$/)) {
            throw new Error("txHash must be a hex string (got: " + txHash + ")");
        }
    }
    catch(e) {
        errors.pushTag("transactionResult")(e);
    }
    return HTTPQuery("/transactionResult/" + txHash, {"get":{}}).
        then(function(txList) {
            if (txList.length === 0) {
                throw errors.tagError(
                    "NotDone",
                    "The transaction with this hash has not yet been executed."
                );
            }
            return txList[0];
        }).
        then(function(txResult){
            if (txResult.transactionHash !== txHash) {
                throw new Error(
                    "could not retrieve transactionResult for hash " + txHash
                );
            }
            if (txResult.message !== "Success!") {
                var msg = "Transaction failed with transaction result:\n"
                    + JSON.stringify(txResult, undefined, "  ") + "\n";
                return transaction({hash: txHash}).
                    then(function(tx) {
                        throw new Error(msg + "\nTransaction was:\n" +
                                        JSON.stringify(tx, undefined, "  "))
                    });
            }
            var contractsCreated = txResult.contractsCreated.split(",");
            txResult.contractsCreated = contractsCreated;
            return txResult;
        }).
        tagExcepts("transactionResult");
} 

module.exports = {
    faucet: faucet,
    submitTransaction: submitTransaction,
    submitTransactionList: submitTransactionList,
    transaction: transaction,
    transactionLast: transactionLast,
    transactionResult: transactionResult,
    submitSendList: submitSendList,
    submitContractCreateList: submitContractCreateList
}
