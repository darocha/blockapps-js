var bigInt = require('bn.js');
var errors = require("./errors.js");

function Int(x) {
    if (x instanceof Int) {
        return x;
    }

    if (!(this instanceof Int)) {
        return new Int(x);
    }
  
    try {
        var result = x;
        if (x == undefined) { // Intentionally ==
            result = 0;
        }
        if (bigInt.isBN(x)) {
            result = x.toString(10);
        }
        else if (typeof x === "string") {
            // bn.js doesn't actually validate its input
            if (x.slice(0,2) === "0x") {
                x = x.slice(2);
                if (!/^[\s\da-fA-F]+$/.test(x)) {
                    throw new Error("Invalid hex integer: " + x);
                }
                result = new bigInt(x,16);
                result = result.toString(10);
            }
            else {
                if (!/^[\s\d]+$/.test(x)) {
                    throw new Error("Invalid decimal integer: " + x);
                }
            }
        }
        try {
            bigInt.call(this, result);
        }
        catch(e) {
            bigInt.call(this, result.toString());
        }
    }
    catch(e) {
        errors.pushTag("Int")(e);
    }
}

Int.prototype = Object.create(bigInt.prototype, {
    constructor: {
        value: Int,
        enumerable: true
    },
    toEthABI: {
        value: function() {
            return this.mod(i256).toString(16, 64);
        },
        enumerable: true
    },
    toString: {
        value: function(n, w) {
            if (!n) {
                n = 10;
            }
            return bigInt.prototype.toString.call(this, n, w);
        },
        enumerable: true
    },
    toJSON: {
        value: function() {
            return this.toString();
        },
        enumerable: true
    },
    valueOf: {
        value: bigInt.prototype.toNumber,
        enumerable: true
    }, 
    pow : {
        value: function(n) {
            return bigInt.prototype.pow.call(this, Int(n));
        }
    },
    mod : {
        value: function(n) {
            // Pointlessly, bn does not have umodn (explicitly)
            var result;
            if (typeof n === "number") {
                result = this.modn(n);
                if (result < 0) {
                    result += n;
                }
                return result;
            }
            return this.umod(n);
        },
        enumerable: true
    },
    plus : {
        value: chooseNumeric("add"),
        enumerable: true
    },
    minus : {
        value: chooseNumeric("sub"),
        enumerable: true
    },
    times : {
        value: chooseNumeric("mul"),
        enumerable: true
    },
    over : {
        value: chooseNumeric("div"),
        enumerable: true
    },
    shiftRight: {
        value: chooseNumeric("shr"),
        enumerable: true
    },
    shiftLeft: {
        value: chooseNumeric("shl"),
        enumerable: true
    }
});

function chooseNumeric(baseName) {
    return function(n) {
        var fn = baseName;
        if (typeof n === "number") {
          fn = baseName + "n";
        }
        return Int(this[fn](n));
    }
}

var i256 = Int(2).pow(256);

Int.uintSized = uintSized;

function uintSized(x, radix) {
    return Int(x).mod(i256);
}

Int.intSized = intSized;

function intSized(x, radix) {
    return uintSized(x, radix).fromTwos(256);
}

module.exports = Int;
