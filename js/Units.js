// This is a literal copy of 'convert-units' using big numbers.
//
// Copyright (c) 2013 Ben Ng, http://benng.me

// Permission is hereby granted, free of charge, to any person
// obtaining a copy of this software and associated documentation
// files (the "Software"), to deal in the Software without
// restriction, including without limitation the rights to use, copy,
// modify, merge, publish, distribute, sublicense, and/or sell copies
// of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:

// The above copyright notice and this permission notice shall be
// included in all copies or substantial portions of the Software.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
// EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
// NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS
// BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN
// ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
// CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

"use strict";

var Int = require("./Int.js")
var bigNum = require('bignumber.js');

/*
 *  Old interface, deprecated
 */
module.exports.unitSchema = {};
for (denom in ethereum) {
    unitSchema[denom] = bigNum(ethereum[denom].to_anchor).toNumber();
}

module.exports.stringToEthUnit = function(s) {
    try {
        return unitSchema[s];
    }
    catch (e) {
        throw "Unit not found";
    }
}

/*
 *  New interface, a la convert-units
 */ 

module.exports.ethValue = ethValue;
function ethValue(x) {
    return {
        "in" : function(denom) {
            return convert(x).from(denom).to("wei");
        }
    };
}

module.exports.convertEth = convert;
function convert (n,d) {
    return new Converter(n,d);
}

var ethereum = {
    wei     : {
        "name" : {
            "singular" : "wei",
            "plural" : "wei"
        },
        "to_anchor" : "1"
    },
    kwei    : {
        "name" : {
            "singular" : "kwei",
            "plural" : "kwei"
        },
        "to_anchor" : "1e3"
    },
    mwei    : {
        "name" : {
            "singular" : "mwei",
            "plural" : "mwei"
        },
        "to_anchor" : "1e6"
    },
    gwei    : {
        "name" : {
            "singular" : "gwei",
            "plural" : "gwei"
        },
        "to_anchor" : "1e9"
    },
    szabo   : {
        "name" : {
            "singular" : "szabo",
            "plural" : "szabo"
        },
        "to_anchor" : "1e12"
    },
    finney  : {
        "name" : {
            "singular" : "finney",
            "plural" : "finney"
        },
        "to_anchor" : "1e15"
    },
    ether   : {
        "name" : {
            "singular" : "ether",
            "plural" : "ether"
        },
        "to_anchor" : "1e18"
    },
};

var schemes = {
    "ethereum" : ethereum
};
module.exports.schemes = schemes;

function Converter(numerator, denominator) {
    var n = Int(numerator).toString(10);
    if(denominator) {
        var d = Int(denominator).toString(10);
        var num = new bigNum(n);
        this.val = num.div(d);
    }
    else {
        this.val = new bigNum(n);
    }
}

/**
 * Lets the converter know the source unit abbreviation
 */
Converter.prototype.from = function (from) {
    if(this.destination) {
        throw new Error('.from must be called before .to');
    }

    this.origin = this.getUnit(from);

    if(!this.origin) {
        this.throwUnsupportedUnitError(from);
    }

    return this;
};

/**
 * Converts the unit and returns the value
 */
Converter.prototype.to = function (to) {
    if(!this.origin) {
        throw new Error('.to must be called after .from');
    }

    this.destination = this.getUnit(to);

    var result;

    if(!this.destination) {
        this.throwUnsupportedUnitError(to);
    }

    /**
     * Convert from the source value to its anchor inside the system
     */
    result = this.val.times(this.origin.unit.to_anchor);

    // /**
    //  * Convert from one system to another through the anchor ratio
    //  */
    // if(this.origin.system != this.destination.system) {
    //     var r = measures[this.origin.measure]._anchors[this.origin.system].ratio;
    //     result = result.times(r);
    // }

    /**
     * Convert to another unit inside the destination system
     */
    //var intModulus = new bigNum(2).pow(256);
    return result.div(this.destination.unit.to_anchor);

};

/**
 * Finds the unit
 */
Converter.prototype.getUnit = function (abbr) {
    for (var scheme in schemes) {
        for (var testAbbr in schemes[scheme]) {
            if(testAbbr == abbr) {
                return {
                    "scheme": scheme,
                    "unit": schemes[scheme][testAbbr]
                };
            }
        }
    }
};

/**
 * An alias for getUnit
 */
Converter.prototype.describe = function (abbr) {
    var resp = Converter.prototype.getUnit(abbr);

    return {
        "scheme": resp.scheme,
        "singular": resp.unit.name.singular,
        "plural": resp.unit.name.plural
    };
};

Converter.prototype.throwUnsupportedUnitError = function (what) {
    var validUnits = [];

    for (scheme in module.exports.schemes) {
        validUnits.concat(Object.keys(schemes[scheme]));
    }

    throw new Error('Unsupported unit ' + what +
                    ', use one of: ' + validUnits.join(', '));
}
