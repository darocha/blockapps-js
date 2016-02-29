var keccak256 = require('js-sha3').keccak_256;

module.exports = sha3;
function sha3(hexString) {
    var input = new Buffer(hexString, "hex");
    return keccak256(input);
}
