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

// Replace a single transaction response (tx hash) with an object with two
// getters:
//   txHash: a promise resolving immediately to the tx hash
//   txResult: a promise resolving to the transaction result object
function handleTransactionResponse(r) {
  function setTXHashHandler(txHash) {
    return Object.create({}, {
      txHash: {
        get: function() { return Promise.resolve(txHash) },
        enumerable: true
      }
    });
  }
  function setTXResultHandler(txHandlers) {
    Object.defineProperty(txHandlers, "txResult", {
      get: function() {
        return txHandlers.txHash.
          then(function(txHash) { return pollPromise(transactionResult.bind(null, txHash)); }).
          catch(Promise.TimeoutError, function() {
            throw new Error(
              "waited " + pollPromise.defaults.pollTimeoutMS / 1000 + " seconds"
            );
          }).
          tagExcepts("txResult handler");
      },
      enumerable: true
    });
    return txHandlers;
  }

  var result = Promise.resolve(r).
    then(setTXHashHandler).
    then(setTXResultHandler);
  return handlers.enable ? result : result.get("txResult");
}

// Accepts a single object in the form required by strato-api's /transaction
// route, returning an object with txHash and txResult handlers.
function submitTransaction(txObj) {
  return HTTPQuery("/transaction", {data: txObj}).
    then(handleTransactionResponse).
    tagExcepts("submitTransaction");
}

// Accepts a list of transaction objects, returning a list of objects with
// txHash and txResult handlers.
function submitTransactionList(txObjList) {
  return HTTPQuery("/transactionList", {data: txObjList}).
    map(handleTransactionResponse).
    tagExcepts("submitTransactionList");
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
    console.log("Looking up " + txHash);
    return HTTPQuery("/transactionResult/" + txHash, {"get":{}}).
        then(function(txList) {
            if (txList.length === 0) {
                throw errors.tagError(
                    "NotDone",
                    "The transaction with this hash has not yet been executed."
                );
            }
            return txList[0]; // FIXME, this is not a valid assumption right now.
        }).
        then(function(txResult){
            console.log("Parsing transactionResult: " + JSON.stringify(txResult))
            if (txResult.transactionHash !== txHash) {
                throw new Error(
                    "could not retrieve transactionResult for hash " + txHash
                );
            }
            if (txResult.trace == "rejected") {
                console.log("Transaction was rejected: " + JSON.stringify(txResult))
                throw new Error("Transaction was rejected: " + JSON.stringify(txResult))
            }
            if (txResult.message !== "Success!") {
                var msg = "Transaction failed with transaction result:\n"
                    + JSON.stringify(txResult, undefined, "  ") + "\n";
                return transaction({hash: txHash, rejected: true}).
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
    transactionResult: transactionResult
}
