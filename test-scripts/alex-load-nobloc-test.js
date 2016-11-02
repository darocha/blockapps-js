#!/usr/bin/env node
var Promise = require("bluebird");
var request = Promise.promisify(require("request"), {multiArgs: true});
var lib = require("..");

var argv = require('minimist')(process.argv.slice(2), 
  { default: 
    { size: 100
    , gapMS: 3000
    , blocURL: "http://localhost:8001"
    , strato: "http://40.84.53.181:3000"
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

var users = ["Alex", "Bank0", "Bank1", "Bank2", "Bank3", "Bank4"];

userMap = {};
Promise.each(users, 
    u => {
      var privkey = lib.ethbase.Crypto.PrivateKey.random(); 
      var address = privkey.toAddress();
      //var account = lib.ethbase.Account(address);
      console.log(u + ": " + address)
      userMap[u] = {address: address, privkey: privkey}
      return lib.routes.faucet(address); // {name: u, privkey: privkey, account: account}
    }
  )
  .then(x => {

  })


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

function makeCalls(addrs) {
  var contractAddr = addrs[0];
  var alexAddr = addrs[1];
  var bankAddrs = addrs.slice(2);
  var calls = [];
  for (i = 0; i < size; ++i) {
    calls.push({
      contractName: "BlockchainRTGSv3",
      contractAddress: contractAddr,
      methodName: "createCentralBankTransaction",
      value: 0,
      args: {
        _senderBank: bankAddrs[i%5],
        _rcptBank: bankAddrs[(1 + i)%5],
        _transactionEncryptedData: ""
      }
    });
  }

  return addFiveBanks().
    then(makeOperational).
    thenReturn([
      alexAddr,
      {
        password: "x",
        resolve: false,
        txs: calls
      }
    ]);

  function addFiveBanks() {
    var addBankCalls = []
    for (i = 0; i < 5; ++i) {
      addBankCalls.push(addBankCall(i));
    }
    return blocRoute(
      "/users/Alex/" + alexAddr + "/callList",
      {
        password: "x",
        resolve: true,
        txs: addBankCalls
      }
    );
  }

  function addBankCall(i) {
    return {
      contractName: "BlockchainRTGSv3",
      contractAddress: contractAddr,
      methodName: "addBank",
      value: 0,
      args: {
        _bank: bankAddrs[i],
        _name: "Bank" + i,
        _certificate: ""
      }
    };
  }

  function makeOperational() {
    var makeOperationalCall = {
      contract: "BlockchainRTGSv3",
      password: "x",
      method: "makeOperational",
      args: {}
    }
    return blocRoute(
      "/users/Alex/" + alexAddr + 
        "/contract/BlockchainRTGSv3/" + contractAddr + "/call",
      makeOperationalCall);
  }

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

var contract = `
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
`;
