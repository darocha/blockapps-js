#!/usr/bin/env node
var Promise = require("bluebird");
var request = Promise.promisify(require("request"), {multiArgs: true});
var lib = require("..");

var argv = require('minimist')(process.argv.slice(2), 
  { default: 
    { size: 100
    , gapMS: 3000
    , blocURL: "http://localhost:8000"
    , strato: "https://strato-scale3.blockapps.net/strato-api"
    }
  }
);

var blocURL = argv.blocURL;
var size = argv.size;
var gapMS = argv.gapMS;

lib.handlers.enable = true;
lib.setProfile("ethereum-frontier", argv.strato);

var timesObj = { arr: [] };
process.on('SIGQUIT', function() {
  var times = timesObj.arr;
  timesObj.arr = [];

  process.stdout.write("\n\n")

  process.stdout.write("Transmission time stats:")
  doStats(times, "s");

  process.stdout.write("Transmission TPS stats:")
  doStats(times.map(function(time) { return size/time; }), "tx/s");

  process.stdout.write("Total TPS stats:")
  doStats(times.map(function(time) { return size/(time + gapMS / 1000); }), "tx/s");
});

function doStats(nums, unit) {
  process.stdout.write(" (ignoring the first half of the data)\n")
  nums = nums.slice(nums.length/2); // Ignore ramp-up measurements;

  var mean = 0;
  nums.forEach(function(num) { mean += num; });
  mean = mean / nums.length;
  process.stdout.write("Mean: " + mean + " " + unit + "\n")

  var variance = 0;
  nums.forEach(function(num) { var diff = num - mean; variance += diff * diff; });
  variance = variance / (nums.length - 1);
  var stdev = Math.sqrt(variance);
  process.stdout.write("Standard deviation: " + stdev + " " + unit + "\n");

  process.stdout.write("\n");
}

var compileContract = lib.Solidity(`
contract BlockchainRTGSv3 {

    address public centralBank; 
    bool public operational; 
    uint public confirmationSeconds;
    uint public totalTransactions;

    struct SharedSymKeys {
            string encryptedTransactionSharedSymKey;
            string encryptedCentralBankTransactionSharedSymKey;
        }

    struct Bank {
            bool exists;
            bool allowed;
            int relativeBalance;
            string name;
            string encryptedBalanceForBank;
            string encryptedBalanceForCentralBank;
            string certificate;
            mapping (address => SharedSymKeys) encryptedSharedSymKeys;
        }


    struct BankWeb{
            address addrBank;
            string name;
        }

    struct Transaction {
            uint time;
            address senderBank;
            address rcptBank;
            address msgSender;
            string transactionEncryptedData;
            bool confirmed;
            bool allowed;
        }

    mapping (address => Bank) public banks;
    mapping (uint => Transaction) public transactionLog;
    mapping(address => uint[]) public bankTransactions;

    BankWeb[] public banksWeb;

    function BlockchainRTGSv3(){
    
            centralBank=msg.sender;
            operational=false;
            totalTransactions = 0;
            confirmationSeconds = 600; 
        }

    modifier onlyOwner() { if (msg.sender != centralBank) throw;_
        }

    modifier onlyIfAllowed() { if (!banks[msg.sender].allowed) throw;_
        }

    function makeOperational() onlyOwner {
            operational=true;
        }

    function changeConfirmationSeconds(uint _confirmationSeconds) onlyOwner {
            confirmationSeconds=_confirmationSeconds;
        }

    function addBank (address _bank, string _name, string _certificate) onlyOwner returns (uint) {
    
            banks[_bank].exists=true;
            banks[_bank].allowed = true;
            banks[_bank].name = _name;
            banks[_bank].certificate = _certificate;
            banksWeb.push(BankWeb(_bank,_name));
            return banksWeb.length;
            
        }

    function addSharedSymmetricKeys(address _senderBank, address _rcptBank, string _encryptedSenderTrSymKey, string _encryptedRcptTrSymKey, string _encryptedCentralBankTrSymKey) onlyOwner {
            banks[_senderBank].encryptedSharedSymKeys[_rcptBank].encryptedTransactionSharedSymKey = _encryptedSenderTrSymKey;
            banks[_rcptBank].encryptedSharedSymKeys[_senderBank].encryptedTransactionSharedSymKey = _encryptedRcptTrSymKey;
            banks[_senderBank].encryptedSharedSymKeys[_rcptBank].encryptedCentralBankTransactionSharedSymKey = _encryptedCentralBankTrSymKey;
            banks[_rcptBank].encryptedSharedSymKeys[_senderBank].encryptedCentralBankTransactionSharedSymKey = _encryptedCentralBankTrSymKey;
        }

    function updateBalance(address _bank, string _encryptedBalanceForCentralBank, 
        string _encryptedBalanceForBank) onlyOwner {
                banks[_bank].encryptedBalanceForCentralBank = _encryptedBalanceForCentralBank;
                banks[_bank].encryptedBalanceForBank = _encryptedBalanceForBank;
            }

    function createTransaction(address _rcptBank, string _transactionEncryptedData) onlyIfAllowed {
    
            if (!banks[_rcptBank].exists) throw;
            if (!banks[msg.sender].exists) throw;
            if (!operational) throw;
    
            totalTransactions++;
            bankTransactions[msg.sender].push(totalTransactions);
            bankTransactions[_rcptBank].push(totalTransactions);
            
    
            transactionLog[totalTransactions] = Transaction(now,msg.sender,_rcptBank,msg.sender,_transactionEncryptedData,false,true);
        }

       function createCentralBankTransaction(address _senderBank, address _rcptBank, string _transactionEncryptedData) onlyOwner {
       
               if (!banks[_rcptBank].exists) throw;
               if (!banks[_senderBank].exists) throw;
               if (!operational) throw;
       
               totalTransactions++;
               bankTransactions[_senderBank].push(totalTransactions);
               bankTransactions[_rcptBank].push(totalTransactions);
       
               transactionLog[totalTransactions] = Transaction(now,_senderBank,_rcptBank,msg.sender,_transactionEncryptedData,false,true);
           }

    function confirmTransaction(uint _transaction) onlyIfAllowed {
            if ((msg.sender != transactionLog[_transaction].senderBank) &&
                        (msg.sender != centralBank)) throw;
            if (!transactionLog[_transaction].allowed) throw;
    
            if (now-transactionLog[_transaction].time < confirmationSeconds) throw;
            
            /*banks[transactionLog[_transaction].senderBank].relativeBalance -=
             * transactionLog[_transaction].value;
             *         banks[transactionLog[_transaction].rcptBank].relativeBalance
             *         += transactionLog[_transaction].value;*/
            transactionLog[_transaction].confirmed=true;
        }

    function blockBank(address _bankToBlk) onlyOwner {
            banks[_bankToBlk].allowed = false;
        }

    function unblockBank(address _bankToBlk) onlyOwner {
            banks[_bankToBlk].allowed = true;
        }

    function blockTransaction(uint _transaction) onlyOwner {
            transactionLog[_transaction].allowed = false;
        }

    function unblockTransaction(uint _transaction) onlyOwner {
            transactionLog[_transaction].allowed = true;
        }

    function kill() onlyOwner {
            suicide(centralBank);
        }
}
`).call("construct");

var users = ["Alex", "Bank0", "Bank1", "Bank2", "Bank3", "Bank4"];

//userMap = users.map(u => {return { name: u , privkey: lib.ethbase.Crypto.PrivateKey.random()}})
userPrivkeys = {};
users.map(u => userPrivkeys[u] = lib.ethbase.Crypto.PrivateKey.random())

Promise.each(users, 
    u => {
      console.log(u + ": " + userPrivkeys[u].toAddress())
      return lib.routes.faucet(userPrivkeys[u].toAddress()); // {name: u, privkey: privkey, account: account}
    }
  )
  .thenReturn(compileContract)
  .call("callFrom", userPrivkeys["Alex"])
  .get("contract")
  .tap(c => {
    console.log("Uploaded BlockchainRTGSv3 at: " + c.account.address);
  })
  .then(setupBanks)
  .tap(c => {
    console.log("Starting timer")
    startTime = process.hrtime();
  })
  //.then(timeBatch)

// newUsers().
//   then(uploadContract).
//   then(makeCalls).
//   spread(timeBatch);

function uploadContract(users) {
  return blocRoute(
      "/users/Alex/" + users[0] + "/contract", 
      { password: "x", src: contract }
    ).
    then(function(contractAddr) {
      users.unshift(contractAddr);
      return users;
    });
}

function makeCalls2(contract){
  var alexAddr = userPrivkeys['Alex'].toAddress();
  var bankAddrs = users.slice(1).map(u => {return userPrivkeys[u]});

  var txList = [];
  for (i = 0; i < size; ++i) {
    var tx = contract.state.createCentralBankTransaction(
      { _senderBank: bankAddrs[i%5]
      , _rcptBank: bankAddrs[(1 + i)%5]
      , _transactionEncryptedData: ""
      }).txParams({nonce: n + i, gasLimit: 1000000, gasPrice: 1});

    tx.from = alexAddr;
    tx.sign(userPrivkeys['Alex']);
    txList.push(tx);
  }

  return lib.routes.submitTransactionList(txList);
}


function setupBanks(contract){
  var alexAddr = userPrivkeys['Alex'].toAddress();
  var bankAddrs = users.slice(1).map(u => {return userPrivkeys[u]});
  return lib.ethbase.Account(userPrivkeys['Alex'].toAddress())
  .nonce
  .then(n => {
    var txList = [];
    for (i = 0; i < 5; ++i){
      var tx = contract.state.addBank(
        { _bank: bankAddrs[i]
        , _name: "Bank" + i
        , _certificate: ""
        }).txParams({nonce: n + i, gasLimit: 1000000, gasPrice: 1});
      tx.from = alexAddr;
      tx.sign(userPrivkeys['Alex']);
      txList.push(tx);
    }
    //return contract.state.makeOperational().callFrom(userPrivkeys['Alex']);
    console.log("adding banks")
    return lib.routes.submitTransactionList(txList);
  })
  .then(_ => {
    console.log("making operational")
    return contract.state.makeOperational().callFrom(userPrivkeys['Alex']);
  })
}

function sendCalls(alexAddr, calls) {
  return blocRoute("/users/Alex/" + alexAddr + "/callList", calls);
}

function timeBatch(alexAddr, calls) {
  process.stdout.write("# Sending " + size + " transactions\n");

  var time0 = process.hrtime();
  var sendBatch = sendCalls(alexAddr, calls).
    then(function() {
      var durationHR = process.hrtime(time0);
      var duration = durationHR[0] + durationHR[1]/1e9;
      timesObj.arr.push(duration);
      process.stdout.write(duration + "\n");
    });

  return Promise.delay(gapMS, sendBatch).
    then(function() { return timeBatch(alexAddr, calls); });
}

function blocRoute(routePath, postBody) {
  var requestOptions = {
    uri: blocURL + routePath,
    method: "POST",
    rejectUnauthorized: false,
    requestCert: true,
    agent: false,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(postBody)
  };
  return request(requestOptions).get(1);
}
