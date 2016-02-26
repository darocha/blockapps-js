var keccak256 = require('js-sha3').keccak_256;
var randomBytes = require('randombytes');
var Address = require("./Address.js");

module.exports.keccak256 = sha3;
function sha3(hexString) {
    var input = new Buffer(hexString, "hex");
    return keccak256(input);
}

var secp256k1 = require('secp256k1/js');
module.exports.secp256k1 = secp256k1;

module.exports.newKeys = newKeys;
function newKeys() {
    var privKey;
    do {
        privKey = randomBytes(32);
    } while (!secp256k1.privateKeyVerify(privKey));

    var pubKey = privKeyToPubKey(privKey);
    return {
        address: pubKeyToAddress(pubKey),
        publicKey: pubKey,
        privateKey: privKey
    };
}

module.exports.privKeyToPubKey = privKeyToPubKey;
function privKeyToPubKey(privKey) {
    return secp256k1.publicKeyConvert(
        secp256k1.publicKeyCreate(privKey),
        false
    ).slice(1);
}

module.exports.pubKeyToAddress = pubKeyToAddress;
function pubKeyToAddress(pubKey) {
    return Address(sha3(pubKey));
}
