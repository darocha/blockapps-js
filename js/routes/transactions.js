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
  function setTXHashHandler(txHash) {
    return Object.create({}, {
      txHash: {
        get: function() { return Promise.resolve(txHash) },
        enumerable: true
      }
    });
  }
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

/**
 * Takes a list of calls, a from address and a privatekey.
 * It submits all these transactions as a signed batch.
 * The format of callList is:
 * [
 * {
 *  contractName: "Sample"
 *  contractAddress: "deadbeef"
 *  methodName: "something"
 *  args: {},
 *  value : 123
 * },
 * ...
 * ]
 * @function submitContractCallList
 * @param {[TransactionCall]} callList - list of calls
 * @param {Address} from - the from address
 * @returns {PrivateKey} - the private key
 */
function submitContractCallList(callList, from, privkey){

    var Account = require("../Account.js");
    var Address = require("../Address.js");
    var Int = require("../Int.js");
    var Solidity = require("../Solidity.js");
    var Transaction = require("../Transaction.js");
    var Units = require("../Units.js");

    return Account(from).nonce
    .then(function(n) {
        var nonceIndex = 0;
        var txs = callList.map(function(c, i){
            var contractJson = c.contractJson;
            var name = c.contractName;
            var method = c.methodName;
            var value = c.value;
            var args = c.args;
            var txParams = c.txParams || {};

            var contract = Solidity.attach(contractJson);

            value = Math.max(0, value)
            if (value != undefined) {
              var pv = Units.convertEth(value).from("ether").to("wei" );
            }
            txParams.value = pv.toString(10);


            if(contract.state[method] != undefined){
              try {
                var toret = contract.state[method](args).txParams(txParams);
              } catch (error){
                console.log("failed to look at state for contract: " + error)
                return {
                  error: "failed to look at state for contract: " + error,
                };
              }
            } else {
              console.log("contract " + contractName + " doesn't have method: " + method);
              return {
                error: "contract " + contractName + " doesn't have method: " + method,
              };
              return;
            }
            toret.nonce = Int(n+nonceIndex);
            toret.from = Address(from);
            toret.txParams(txParams);
            toret.sign(privkey);

            nonceIndex++;

            return toret;
        })

        //console.log("Submitting txs for submitContractCreateList: " + JSON.stringify(txs))
        return submitTransactionList(txs);
    });
}

/**
 * Takes a list of detached() contracts, a from address and a privatekey.
 * It submits all these transactions as a signed batch.
 * The format of callList is:
 * [
 * {
 *  contractName: "Sample"
 *  args: {},
 *  value : 123
 * },
 * ...
 * ]
 * @function submitContractCreateList
 * @param {[TransactionCall]} contractList - list of calls
 * @param {Address} from - the from address
 * @returns {PrivateKey} - the private key
 */
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

        //console.log("Submitting txs for submitContractCreateList: " + JSON.stringify(txs))
        return submitTransactionList(txs);
    });
}

/**
 * Takes a list of addresses and values in WEI, a from address and a privatekey.
 * It submits all these transactions as a signed batch.
 * The format of callList is:
 * [
 * {
 *  toAddress: "deadbeef"
 *  value: 56464352342342435
 * },
 * ...
 * ]
 * @function submitSendList
 * @param {[TransactionCall]} toValList - list of transactions
 * @param {Address} from - the from address
 * @returns {PrivateKey} - the private key
 */
function submitSendList(toValList, from, privkey){

    var Account = require("../Account.js");
    var Address = require("../Address.js");
    var Int = require("../Int.js");
    var Transaction = require("../Transaction.js");

    return Account(from).nonce
    .then(function(n) {
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

        //console.log("Submitting txs for submitSendList: " + JSON.stringify(txs))
        return submitTransactionList(txs);
    });
}

function submitTransactionList(txObjList) {
  function setTXHashHandler(txHashList) {
    return txHashList.map(function(txHash) {
      if(txHash === `undefined`){
        return "wrong tx";
      } else {
        return {txHash: Promise.resolve(txHash)}
      }
    });
  }
  function setTXResultHandler(txHandlerList) {
      return txHandlerList.map(txBasicHandler);
  }

  console.log('txObjList>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>',txObjList);
  var filterTxList = txObjList.filter(function(item) {
    if(item.error) {
      return false;
    } else {
      return true;
    }
  });

  console.log('filterTxList>>>>>>>>>>>>>>',filterTxList);
  var result =

    HTTPQuery("/transactionList", {"data":filterTxList}).
    then(setTXHashHandler).
    then(setTXResultHandler).
    tagExcepts("submitTransactionList");

    if(handlers.enable) {
      return result.then(function(txResults){
        txObjList.forEach(function(item, i) {
          if(item.error) {
            txResults.splice(i,0,item);
          }
        });
        console.log('returning handlers.enable === true txResults', txResults);
        return txResults;
      });
    } else {
      return result.get("txResult").then(function(txResults){
        txObjList.forEach(function(item, i) {
          if(item.error) {
            txResults.splice(i,0,item);
          }
        });
        console.log('returning handlers.enable === false txResults', txResults);
        return txResults;
      });
    }
  // return handlers.enable ? result : result.get("txResult");
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
    console.log(txHash);
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
                    console.log(msg);
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
    submitContractCallList: submitContractCallList,
    submitContractCreateList: submitContractCreateList
}
