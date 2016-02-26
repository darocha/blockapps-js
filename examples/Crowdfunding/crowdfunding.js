var blockapps = require("blockapps-js");
var faucet = blockapps.routes.faucet;
var newKeys = blockapps.ethbase.Crypto.newKeys;
var Solidity = blockapps.Solidity;
var Promise = require("bluebird");

blockapps.setProfile("strato-dev", "http://localhost:3000", "1.1");
//blockapps.polling.pollEveryMS = 1000
//blockapps.polling.pollTimeoutMS = 30000

var contract, keystore;
var names = {};
var privkey = "1dd885a423f4e212740f116afa66d40aafdbb3a381079150371801871d9ea281";

var src = '\
contract Crowdsource {\
    uint numContribs;\
\
    struct ContribInfo {\
        string name;\
        uint totalPayments;\
    }\
    mapping (address => ContribInfo) contribInfo;\
    address[] contributors;\
\
    function Crowdsource() {\
        contributors.length = 0;\
    }\
\
    function contribute(string name) returns (bool) {\
        if (msg.value == 0) {\
            return false;\
        }\
\
        var contributor = contribInfo[msg.sender];\
        if (contributor.totalPayments == 0) {\
            contributors.push(msg.sender);\
            contributor.name = name;\
        }\
        contributor.totalPayments += msg.value;\
        contribInfo[msg.sender] = contributor;\
        ++numContribs;\
        return true;\
    }\
}\
'

function start() {
    document.getElementById('placardArea').value = "No donations so far...";
    
    var donate = document.getElementById('donate');
    donate.disabled = true;    

    Solidity(src).
        call("construct").
        call("txParams", {gasLimit: 1000000}).
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
        then(contribute.bind(null, name, value)).
        then(artistPlacard).
        then(function(text){
            placard.value = text;
        }).
        catch(console.log.bind(console)).
        finally(function() {
            donate.disabled = false;
        });
}

function fund(name) {
    return faucet(patronKey(name).address);
}

function contribute(name, value) {
    return contract.state.contribute(name).
        txParams({"value":value, gasLimit:1000000}).
        callFrom(names[name].privateKey);
}

function patronKey(name) {
    if (!(name in names)) {
        console.log("Creating new account: " + name)
        names[name] = newKeys();
    }
    return names[name];
}

function artistPlacard() {
    return Promise.join(
        contract.state.recipient,
        contract.state.numContribs,
        contract.state.contributors.map(contract.state.contribInfo),
        function(recipient, numContribs, cInfos) {
            var lines = [
                "I have been generously supported by " + numContribs +
                    " grant(s) from the following patrons:",
            ]

            return lines.concat(cInfos.map(function(cInfo) {
                var result = "  The honorable " + cInfo.name;
                result += ": " + cInfo.totalPayments + " wei";
                return result;
            })).join("\n");
        }
    );
}
