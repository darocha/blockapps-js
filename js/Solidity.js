var routes = require("./Routes.js");
var solc = routes.solc;
var extabi = routes.extabi;
var Account = require("./Account.js");
var Address = require("./Address.js");
var Int = require("./Int.js");
var Storage = require("./Storage.js");
var Promise = require('bluebird');
var Enum = require('./solidity/enum');
var Transaction = require('./Transaction.js');

var keccak256 = require("./Crypto.js").keccak256;

var readStorageVar = require("./solidity/storage.js");
var util = require("./solidity/util.js");
var solMethod = require("./solidity/functions.js");

var assignType = require("./types.js").assignType;
var errors = require("./errors.js");

var handlers = require("./handlers.js");

module.exports = Solidity;
module.exports.sendList = sendSolTXList;

// string argument as in solc(code, _)
// object argument as in solc(_, dataObj)
// Solidity(x :: string | object) = {
//   <contract name> : {
//     bin : <hex string>,
//     xabi : <solidity-abi response>
//   } :: Solidity
//   ...
// }
// If only one object given as "code", collapses to
// { name : <contract name>, _ :: Solidity }
function Solidity(x) {
  var code = "";
  var dataObj = {};
  switch (typeof x) {
    case "string" :
      code = x;
      break;
    case "object" :
      dataObj = x;
      break;
  }

  return extabi(code, dataObj).
  then(function(xabiResp){
    var solcCall = solc(code, xabiResp.dataObj);
    delete xabiResp.dataObj;

    return solcCall.then(function(solcResp){
      delete solcResp.dataObj;
      return { xabiR:xabiResp, solcR:solcResp }
    });
  }).
  then(function(resp){
    var solcR = resp.solcR;
    var xabiR= resp.xabiR;
    var files = {};
    for (file in solcR) {
      var contracts = {};
      for (contract in solcR[file]) {
        var xabi = xabiR[file][contract];
        var bin = solcR[file][contract].bin;
        var binr = solcR[file][contract]["bin-runtime"];
        contracts[contract] = makeSolidity(xabi, bin, binr, contract);
      }
      files[file] = contracts;
    };
    // Backwards compatibility
    if (Object.keys(files).length === 1 &&
      Object.keys(files)[0] === "src" &&
      Object.keys(files.src).length == 1)
    {
      contract = Object.keys(files.src)[0];
      files = files.src[contract];
      files.name = contract;
    }
    return files;
  }).
  tagExcepts("Solidity");
}
Solidity.prototype = {
    "bin" : null,
    "xabi" : null,
    "constructor" : Solidity,
    "construct": function() {
        try {
            var constrDef = {
                "selector" : this.bin,
                "args": this.xabi.constr,
                "vals": {}
            };
            var tx = solMethod.
                call(this, this.xabi.types, constrDef, this.name).
                apply(Address(null), arguments);
            tx.callFrom = function(privkey) {
              return this.send(privkey).then(this.setHandler);
            }
            tx.setHandler = setContractHandler.bind(tx._solObj);
            return tx;
        }
        catch (e) {
            errors.pushTag("Solidity")(e);
        }
    },
    "newContract" : function (privkey, txParams) { // Backwards-compatibility
        return this.construct().txParams(txParams).callFrom(privkey);
    },
    "detach": function() {
        var copy = {
            "bin": this.bin,
            "bin-runtime": this["bin-runtime"],
            "codeHash": this["codeHash"],
            "xabi": this.xabi,
            "name": this.name
        };
        if (this.account) {
            copy.address = this.account.address;
        }
        return JSON.stringify(copy);
    }
};
Solidity.attach = function(x) {
    try {
        if (typeof x === "string") {
            x = JSON.parse(x);
        }
        var result = makeSolidity(x.xabi, x.bin, x['bin-runtime'], x.name);
        if (x.address) {
            result.address = Address(x.address);
            return attach(result);
        }
        else {
            return result;
        }
    }
    catch(e) {
        errors.pushTag("Solidity")(e);
    }
}

function makeSolidity(xabi, bin, binr, contract) {
    var typesDef = xabi.types;
    for (typeName in typesDef) {
        var typeDef = typesDef[typeName];
        if (typeDef.type === "Enum") {
            typeDef.names = Enum(typeDef.names, typeName);
        }
    }
    util.setTypedefs(typesDef, xabi.vars);

    return assignType(
        Solidity,
        {
            "bin": bin,
            "bin-runtime": binr,
            "codeHash": binr ? keccak256(binr) : undefined,
            "xabi": xabi,
            "name": contract
        }
    );
}

function setContractHandler(txHandlers) {
  var contract = this;
  var txResult = handlers.enable ? txHandlers.txResult : txHandlers;

  Object.defineProperty(txHandlers, "contract", {
    get: function() {
      return Promise.resolve(txResult).
        get("contractsCreated").
        get(0).
        then(Address).
        then(function(addr) {
          contract.address = addr;
        }).
        thenReturn(contract).
        then(attach).
        tagExcepts("contract handler");
    },
    enumerable: true
  })
  // Use like solObj.construct().callFrom(privkey) to get a dictionary of
  // handlers: {txHash:, txResult, contract}
  // Resolving .contract will construct the attached Solidity object (previous
  // behavior was to construct this in one step)
  return handlers.enable ? txHandlers : txHandlers.contract;
}

function sendSolTXList(solTXList, privkey) {
  return Transaction.sendList(solTXList, privkey).
    map(function(handlers, i) {
      return solTXList[i].setHandler(handlers);
    });
}

function attach(solObj) {
    var state = {};
    var xabi = solObj.xabi;
    var types = xabi.types;

    var addr = solObj.address;
    delete solObj.address;
    var funcs = xabi.funcs;
    for (var func in funcs) {
        var funcDef = funcs[func]
        Object.defineProperty(state, func, {
            value: solMethod(types, funcDef, func).bind(addr),
            enumerable: true
        });
        state[func].toJSON = (function(fDef) {
            var args = util.entriesToList(fDef.args).
                map(function(arg) { return arg.type; }).
                join(", ");
            var vals = util.entriesToList(fDef.vals).
                map(function(val) { return val.type; }).
                join(", ");
            return "function (" + args + ") returns (" + vals + ")";
        }).bind(null, funcDef);
    }

    var storage = new Storage(addr);
    var svars = xabi.vars;
    for (var svar in svars) {
        Object.defineProperty(state, svar, {
            get : makeSolObject.bind(null, types, svars[svar], storage),
            enumerable: true
        });
    }

    if ("state" in solObj) {
        solObj = Object.getPrototypeOf(solObj);
    }
    return assignType(solObj, {
        "account" : Account(addr),
        "state" : state
    });
}

function makeSolObject(typeDefs, varDef, storage) {
    switch (varDef.type) {
    case "Mapping":
        var mapLoc = Int(Int(varDef["atBytes"]).over(32)).toEthABI();
        var keyType = varDef["key"];
        var valType = varDef["value"];
        util.setTypedefs(typeDefs, {key: keyType});
        util.setTypedefs(typeDefs, {val: valType});

        var result = function(x) {
            try {
                var arg = util.readInput(typeDefs, keyType, x);
                var keyBytes;
                switch (keyType["type"]) {
                case "Address":
                    keyBytes = arg.toEthABI();
                    break;
                case "Bool":
                    keyBytes = Int(arg ? 1 : 0).toEthABI();
                case "Int":
                    keyBytes = arg.toEthABI();
                    break;
                case "Bytes":
                    if (!keyType.dynamic) {
                        var result = arg.toString("hex");
                        while (result.length < 64) { // nibbles
                            result = "00" + result;
                        }
                        keyBytes = result;
                    }
                }

                var valueCopy = {}
                for (var p in valType) {
                    valueCopy[p] = valType[p];
                }
                valueCopy["atBytes"] = util.dynamicLoc(keyBytes + mapLoc);
                return makeSolObject(typeDefs, valueCopy, storage);
            }
            catch(e) {
                errors.pushTag("Mapping")(e);
            }
        };
        result.toJSON = function() {
            return "mapping (" + keyType.type + " => " + valType.type + ")";
        }
        return result;
    case "Array":
        return Promise.try(function() {
            if (varDef.dynamic) {
                return util.dynamicDef(varDef,storage);
            }
            else {
                return [Int(varDef.atBytes), varDef.length];
            }
        }).spread(function(atBytes, lengthBytes) {
            var numEntries = Int(lengthBytes).valueOf();
            var entryDef = varDef["entry"];
            util.setTypedefs(typeDefs, {entry: entryDef});
            var entrySize = util.objectSize(entryDef, typeDefs);

            var entryCopy = {}
            for (var p in entryDef) {
                entryCopy[p] = entryDef[p];
            }

            var result = [];
            atBytes = util.fitObjectStart(atBytes, 32); // Artificially align
            while (result.length < numEntries) {
                entryCopy["atBytes"] = util.fitObjectStart(atBytes, entrySize);
                result.push(makeSolObject(typeDefs, entryCopy, storage));
                atBytes = entryCopy["atBytes"].plus(entrySize);
            }
            return Promise.all(result);
        });
    case "Struct":
        var userName = varDef["typedef"];
        var typeDef = typeDefs[userName];
        var fields = typeDef["fields"];
        util.setTypedefs(typeDefs, fields);
        // Artificially align
        var baseKey = util.fitObjectStart(varDef["atBytes"], 32);

        var result = {};
        for (var name in fields) {
            var field = fields[name];
            var fieldCopy = {};
            for (var p in field) {
                fieldCopy[p] = field[p];
            }
            var fieldOffset = Int(field["atBytes"]);
            fieldCopy["atBytes"] = baseKey.plus(fieldOffset);
            result[name] = makeSolObject(typeDefs, fieldCopy, storage);
        }
        return Promise.props(result);
    default:
        return readStorageVar(varDef, storage);
    }
}
