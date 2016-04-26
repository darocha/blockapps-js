var randomBytes = require('randombytes');
var Address = require("../Address.js");
var Int = require("../Int.js");
var errors = require("../errors.js");
var keccak256 = require("./keccak256.js");
var ec0 = require("elliptic");
var ec = new ec0.ec('secp256k1');
var mnemonic = require("mnemonic");

var curveN = Int(ec.n);

module.exports = PrivateKey;

var pkeyDescrs = {
    constructor: {value: PrivateKey},
    toString: {
        value: function() {
            return Buffer.prototype.toString.bind(this)("hex");
        },
        enumerable: true
    },
    toJSON: {
        value: function() {
            return this.toString();
        },
        enumerable: true
    },
    toPubKey: {
        value: function() {
            return new Buffer(ec.keyFromPrivate(this).getPublic(false, true).slice(1));
        },
        enumerable: true
    },
    toAddress: {
        value: function() {
            return pubKeyToAddress(this.toPubKey());
        },
        enumerable: true
    },
    toMnemonic: {
        value: function() {
            return mnemonic.encode(this.toString()).join(" ");
        },
        enumerable: true
    },
    sign: {
        value: function(data) {
          try {
            data = new Buffer(data, "hex");
            var ecSig = ec.keyFromPrivate(this).sign(data);
            return {
                r: Int(ecSig.r),
                s: Int(ecSig.s),
                v: ecSig.recoveryParam + 27
            };
          }
          catch (e) {
            errors.pushTag("PrivateKey")(e);
          }
        },
        enumerable: true
    },
    verify: {
        value: function(data, signature) {
          try {
            data = new Buffer(data, "hex");
            signature = {
              r: signature.r.toString(),
              s: signature.s.toString(),
              recoveryParam: signature.v - 27
            };
            return ec.keyFromPrivate(this).verify(data, signature);
          }
          catch (e) {
            errors.pushTag("PrivateKey")(e);
          } 
        }
    }
};
function PrivateKey(x) {
    try {
        if (PrivateKey.isInstance(x)) {
            return x;
        }
        if (typeof x === "number" || x instanceof Int) {
            x = x.toString(16);
        }

        var result;
        if (typeof x === "string") {
            result = new Buffer(32);
            result.fill(0);
            if (x.slice(0,2) === "0x") {
                x = x.slice(2);
            }
            if (x.length > 64) {
                throw new Error("Private key must be 32 bytes")
            }
            if (x.length % 2 != 0) {
                x = "0" + x;
            }
            var byteLength = x.length/2;

            if (!x.match(/^[0-9a-fA-F]*$/)) {
                throw new Error("Private key must be valid hex");
            }
            
            result.write(x, 32 - byteLength, byteLength, "hex");
        }
        else if (Buffer.isBuffer(x)) {
            if (x.length < 32) {
                result = new Buffer(32);
                result.fill(0);
                x.copy(result, 32 - x.length);
            }
            else {
                result = x.slice(-32);
            }
        }
        else {
            throw new Error("private key must be a number, a hex string, or a Buffer");
        }

        if (!privateKeyVerify(result)) {
            throw new Error("invalid private key: " + result.toString("hex"));
        }
        Object.defineProperties(result, pkeyDescrs);        
        return result;
    }
    catch(e) {
        errors.pushTag("PrivateKey")(e);
    }
}
PrivateKey.prototype = Object.create(Buffer.prototype, pkeyDescrs);
PrivateKey.isInstance = function(x) {
    return (Buffer.isBuffer(x) && x.constructor === PrivateKey);
}
PrivateKey.fromMnemonic = function(m) {
    return PrivateKey(mnemonic.decode(m.split(" ")));
}
PrivateKey.random = function() {
  var result;
  do {
    result = randomBytes(32);
  } while (!privateKeyVerify(result));
  return PrivateKey(result);
}

function pubKeyToAddress(pubKey) {
    pubKey = new Buffer(pubKey, "hex");
    return Address(keccak256(pubKey));
}

function privateKeyVerify(x) {
     x = Int(x);
     return x.gt(0) && x.lt(curveN);
}
