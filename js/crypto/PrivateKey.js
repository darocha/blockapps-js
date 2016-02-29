var randomBytes = require('randombytes');
var Address = require("../Address.js");
var Int = require("../Int.js");
var errors = require("../errors.js");
var keccak256 = require("./keccak256.js");
var secp256k1 = require('secp256k1/js');
var mnemonic = require("mnemonic");

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
            return secp256k1.publicKeyConvert(
                secp256k1.publicKeyCreate(this),
                false
            ).slice(1);
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
        value: function (data) {
            data = new Buffer(data, "hex");
            var ecSig = secp256k1.sign(data, this);
            return {
                r: Int(ecSig.signature.slice(0,32)),
                s: Int(ecSig.signature.slice(32,64)),
                v: ecSig.recovery + 27
            };
        },
        enumerable: true
    }
};
function PrivateKey(x) {
    try {
        if (PrivateKey.isInstance(x)) {
            return x;
        }
        if (typeof x === "number" || Int.isInstance(x)) {
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
        else if (!x) {
            do {
                result = randomBytes(32);
            } while (!secp256k1.privateKeyVerify(result));
        }
        else {
            throw new Error("private key must be a number, a hex string, or a Buffer");
        }

        if (!secp256k1.privateKeyVerify(result)) {
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

function pubKeyToAddress(pubKey) {
    pubKey = new Buffer(pubKey, "hex");
    return Address(keccak256(pubKey));
}
