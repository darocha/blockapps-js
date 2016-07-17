var lib = require('./blockapps-js/index.js'),
  Solidity = lib.Solidity;
lib.setProfile('strato-dev', 'http://branch-120461499.centralus.cloudapp.azure.com', '1.2');

Solidity({
  main: {
    "Migrations.sol":undefined
  },
  import: {
    // "Document.sol":undefined
  },
}).get("Migrations").get("Migrations").then(function(solObj) {
  // Use the solObj as above
  console.log('solObj: ',solObj);
});
