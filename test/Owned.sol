contract Owned {
  address public _owner;

  function Owned() {
    _owner = msg.sender;
  }

  function chown(address newOwner) isOwned {
    _owner = newOwner;
  }

  modifier isOwned() {
    if (_owner == msg.sender) _
    else throw;
  }
}
