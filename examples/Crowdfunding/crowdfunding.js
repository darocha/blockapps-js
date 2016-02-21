var blockapps = require("blockapps-js");
var faucet = blockapps.routes.faucet;
var Solidity = blockapps.Solidity;
var Promise = require("bluebird");

blockapps.setProfile("strato-dev", "http://localhost:3000", "1.1");
//blockapps.polling.pollEveryMS = 1000
//blockapps.polling.pollTimeoutMS = 30000

var contract, keystore;
var names = {};
var privkey = "1dd885a423f4e212740f116afa66d40aafdbb3a381079150371801871d9ea281";

function start() {
    document.getElementById('placardArea').value = "No donations so far...";
    
    var donate = document.getElementById('donate');
    donate.disabled = true;    

    var randomSeed = lightwallet.keystore.generateRandomSeed();
    keystore = new lightwallet.keystore(randomSeed, "");

    Solidity({main:{"./crowdfunding.sol":undefined}}).
        get("crowdfunding").get("Crowdsource").
        call("construct").
        call("callFrom", privkey).
        then(function(c) {
            contract = c;
            donate.disabled = false;
        }, function(e) {
            console.log("Error");
            console.log(e);
            donate.disabled = false;
        });
}

function buttonPush() {
    var name = document.getElementById('patronName').value; 
    var value = document.getElementById('patronValue').value;
    var placard = document.getElementById("placardArea");    
    var donate = document.getElementById('donate');

    donate.disabled = true;
    fund(name). 
        return(patronize(name, value)).
        then(function(reply) {
            console.log(reply);
            return artistPlacard().then(function(text){
                placard.value = text;
            });
        }, function(e) {
            console.log("Error");
            console.log(e);
        }).finally(function() {
            donate.disabled = false;
        }).catch(function() {});
}

function fund(name) {
    return faucet(patronKey(name).address);
}

function patronize(name, value) {
    return contract.state.patronize(name).txParams({"value":value}).
        callFrom(patronKey(name).privkey);
}

function patronKey(name) {
    if (name in names) {
        return names[name];
    }
    else {
        var address = keystore.generateNewAddress("");
        names[name] = {
            "privkey" : keystore.exportPrivateKey(address,""),
            "address" : address
        }
        return names[name];
    }
}

function artistPlacard() {
    return Promise.join(
        contract.state.artist,
        contract.state.numGrants,
        contract.state.patrons.map(contract.state.patronInfo),
        function(artist, numGrants, pInfos) {
            var lines = [
                "My name is: " + artist,
                "I have been generously supported by " + numGrants +
                    " grant(s) from the following patrons:",
            ]

            return lines.concat(pInfos.map(function(pInfo) {
                var result = "  The honorable " + pInfo.name;
                if (pInfo.returning) {
                    result += " (repeatedly)";
                }
                result += ": " + pInfo.totalPayments + " wei";
                return result;
            })).join("\n");
        }
    );
}
