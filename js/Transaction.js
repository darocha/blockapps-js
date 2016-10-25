var rlp = require('rlp');
var Crypto = require("./Crypto.js");
var sha3 = Crypto.keccak256;
var submitTransaction = require("./Routes.js").submitTransaction;
var Account = require("./Account.js");
var Address = require("./Address.js");
var Int = require("./Int.js");
var errors = require("./errors.js");
var Promise = require("bluebird");
var enableHandlers = require("./handlers.js");

module.exports = Transaction;

var defaults = {
    "value": 0
};

module.exports.defaults = defaults;

// argObj = {
//   data:, value:, gasPrice:, gasLimit:, nonce:
// }
function Transaction(argObj) {
    if (!(this instanceof Transaction)) {
        return new Transaction(argObj);
    }
    
    try {
        var tx = this;
        if (typeof argObj !== "object") {
            argObj = {};
        }
        ["gasPrice", "gasLimit", "value"].forEach(function(prop) {
            tx[prop] = Int((prop in argObj ? argObj : defaults)[prop]);
        });
        if ("nonce" in argObj) {
          tx.nonce = Int(argObj.nonce);
        }
        tx.data = new Buffer(argObj.data || "", "hex");
        tx.to = Address(argObj.to);
    }
    catch(e) {
        throw errors.pushTag("Transaction")(e);
    }
}
Object.defineProperties(Transaction.prototype, {
    partialHash : {
        value : txHash(false),
        enumerable : true
    },
    fullHash : {
        value : txHash(true),
        enumerable : true
    },
    sign : {
        value : signTX,
        enumerable : true
    },
    send : {
        value : sendTX,
        enumerable : true
    },
    from : {
        value : undefined,
        enumerable : true,
        writable : true
    },
    to : {
        value : Address(0),
        enumerable : true,
        writable : true
    },
    data : {
        value : new Buffer(0),
        enumerable : true,
        writable : true
    },
    toJSON : {
        value : txToJSON,
        enumerable : true
    }
});

function signTX(privkey) {
    privkey = Crypto.PrivateKey(privkey);
    var rsv = privkey.sign(this.partialHash());
    this.r = rsv.r;
    this.s = rsv.s;
    this.v = rsv.v;
}

function txHash(full) {
    return function() {
        var txArr = txArray(this);
        if (!full) {
            txArr = txArr.slice(0,6);
        }
        return sha3(rlp.encode(txArr));
    }
}

function sendTX(privKeyFrom, addressTo) {
    var tx = this;
    try {
        privKeyFrom = Crypto.PrivateKey(privKeyFrom);
        tx.from = privKeyFrom.toAddress()
        if (arguments.length > 1) {
            tx.to = Address(addressTo);
        }
    }
    catch(e) {
        throw errors.pushTag("Transaction")(e);
    }

    var setNonce;
    if ("nonce" in tx) {
      setNonce = Promise.resolve();
    }
    else {
      setNonce = 
        Account(tx.from).nonce.
          then(function(nonce) {
            tx.nonce = nonce;
          });
    }
    var result = 
      setNonce.
        then(function() { 
          tx.sign(privKeyFrom);
          return submitTransaction(tx);
        }).
        tagExcepts("Transaction");
    return result;
}

function txToJSON() {
    var result = {
        "nonce"      : this.nonce,
        "gasPrice"   : this.gasPrice,
        "gasLimit"   : this.gasLimit,
        "to"         : this.to.toString(),
        "value"      : this.value,
        "codeOrData" : this.data.toString("hex"),
        "from"       : this.from.toString(),
        "r"          : this.r.toString(16),
        "s"          : this.s.toString(16),
        "v"          : this.v.toString(16),
        "hash"       : this.partialHash()
    }
    if (result.to == "") {
        delete result.to;
    }
    return result;
}

function txArray(tx) {
    return [
        txInt(tx.nonce, "nonce"),
        txInt(tx.gasPrice, "gas price"),
        txInt(tx.gasLimit, "gas limit"),
        tx.to,
        txInt(tx.value, "value"),
        tx.data,
        txInt(tx.v, "v"),
        txInt(tx.r, "r"),
        txInt(tx.s, "s")
    ];
}

function txInt(x, name) {
    x = x || 0;
    x = new Buffer(Int(x).toEthABI(), "hex");
    while (x.length > 0 && x[0] === 0) {
        x = x.slice(1);
    }
    if (x.length > 32) {
        throw new Error("tx field " + name + " must have fewer than 32 bytes");
    }
    return x;
}

/**
 * Takes a list of transactions, and a starting nonce, and 
 * updates all nonces incrementing by one starting with that nonce.
 * @function transactionListNonce
 * @param {[Transaction]} txList - list of transactions
 * @param {Number} startNonce - the Starting Nonce
 * @returns {[Transaction]}
 */ 

function transactionListNonce(txList, startNonce) { 
    return txList.map(function (tx, index) { return tx.txParams({nonce: index+startNonce }) } );
}

/**
 * Takes a list of transactions and a private key and signs them all.
 * @function transactionListSign
 * @param {[Transaction]} txList - list of transactions
 * @param {privkey} privkey - the private key
 * @returns {[Transaction]}
 */ 

function transactionListSign(txList, privkey) { 
    return transactionListSign.map(function (tx) { tx.sign(privkey); return tx; });
} 

