contract Receive {
    mapping (address => string) mesgs;
    mapping (uint => address) senders;
    uint count;

    function Receive() {
        message("Contract creation");
    }

    function message(string mesg) {
        senders[count] = msg.sender;
        ++count;
        mesgs[msg.sender] = mesg;
    }
}
contract Send {
    bool sent;
    string message;
    Receive receiver;

    function Send(address a, string mesg) {
        message = mesg;
        receiver = Receive(a);
    }

    function send() returns (string) {
        if (sent) {
            return "Message already sent";
        }
        else {
            receiver.message(message);
            sent = true;
            return "Message sent.";
        }
    }
}
