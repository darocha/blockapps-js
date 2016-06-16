var bigNum = require("bignumber.js");
var Int = require("./Int.js");
var errors = require("./errors.js");
var extendType = require("./types.js").extendType;

function Fixed(x, iB, fB) {
  if (x instanceof Fixed) {
    return x;
  }

  try {
    x = x || 0; 
    var bignumResult;
    try {
      bignumResult = new bigNum(x);
    }
    catch (e) {
      bigNumResult = new bigNum(x.toString());
    }

    var result = extendType(Fixed, bignumResult);
    result.intBytes = iB || 128;
    result.fracBytes = fB || 128;
    return result;
  }
  catch(e) {
    errors.pushTag("Fixed")(e);
  }
}

Fixed.prototype = {
  constructor: Fixed,
  intBytes: 128,
  fracBytes: 128,
  toEthABI: function() {
    var fracPow = bigNum(2).pow(this.fracBytes * 8);
    var thisInt = this.times(fracPow);
    return Int(thisInt.toString()).toEthABI();
  }
};

module.exports = Fixed;
