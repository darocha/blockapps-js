var routes = require("./Routes.js");
var solc = routes.solc;
var extabi = routes.extabi;
var Account = require("./Account.js");
var Address = require("./Address.js");
var Int = require("./Int.js");
var Storage = require("./Storage.js");
var Promise = require('bluebird');
var Enum = require('./solidity/enum');

var readStorageVar = require("./solidity/storage.js");
var util = require("./solidity/util.js");
var solMethod = require("./solidity/functions.js");

var assignType = require("./types.js").assignType;
var errors = require("./errors.js");

module.exports = Solidity;

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
    try {
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
        var solcR = solc(code, dataObj);
        var xabiR = extabi(code, dataObj);
    }
    catch(e) {
        errors.pushTag("Solidity")(e);
    }
    return Promise.
        join(solcR, xabiR, function(solcR, xabiR) {
            var files = {};
            for (file in solcR) {
                var contracts = {};
                for (contract in solcR[file]) {
                    var xabi = xabiR[file][contract];
                    var bin = solcR[file][contract].bin;
                    contracts[contract] =
                        makeSolidity(xabi, bin, contract);
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
            tx.callFrom = constrFrom;
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
        x = assignType(Solidity, x);
        if (x.address) {
            x.address = Address(x.address);
            return attach(x);
        }
        else {
            return x;
        }
    }
    catch(e) {
        errors.pushTag("Solidity")(e);
    }
}

function makeSolidity(xabi, bin, contract) {
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
            "xabi": xabi,
            "name": contract
        }
    );
}

function constrFrom(privkey) {
    var contract = this._solObj;
    return this.send(privkey).
        get("contractsCreated").
        tap(function(addrList){
            if (addrList.length !== 1) {
                throw new Error("constructor must create a single account");
            }
        }).
        get(0).
        then(Address).
        then(function(addr) {
            contract.address = addr;
        }).
        thenReturn(contract).
        then(attach).
        tagExcepts("Solidity");
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
