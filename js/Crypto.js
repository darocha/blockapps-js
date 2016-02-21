var SHA3 = require('sha3')

module.exports.sha3 = sha3;
function sha3(hexString) {
    var result = new SHA3.SHA3Hash(256)
    var input = new Buffer(hexString, "hex");
    result.update(input);
    return result.digest("hex");
}
