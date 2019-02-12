pragma solidity ^0.5.0;

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";

import "../Interfaces/IKhanaLogic.sol";


contract CommunityEvents is Ownable {
    
    IKhanaLogic public khanaLogic;
    address public newerEventsContract;

    /**
     * @dev Throws if called by a non-admin account.
     */
    modifier onlyAdmins() {
        require(khanaLogic.isAdmin(msg.sender), "Only admins can perform this action");
        _;
    }

    constructor(address _khanaLogicAddress) public {
        khanaLogic = IKhanaLogic(_khanaLogicAddress);
    }

    /**
     * @dev Set valid khanaLogic address.
     * @param _khanaLogic The address of the new communityRegister.
     */
    function setKhanaLogic(address _khanaLogic) external onlyAdmins returns (bool) {
        khanaLogic = IKhanaLogic(_khanaLogic);
        return true;
    }

    /**
     * @dev Set a new address for a more recent events contract.
     * @notice If `newerEventsContract` is set, then this current contract has been 
     * superseeded by the contract at `newerEventsContract`.
     * @param _newEventsContract The address of the newer events contract.
     */
    function setNewerEventsContract(address _newEventsContract) external onlyAdmins returns (bool) {
        newerEventsContract = _newEventsContract;
        return true;
    }

    //
    // Emitting Event Functions
    //

    /**
     * @dev Emit an event that includes a boolean as the main value.
     * @notice Example: when a contract is active or not.
     * @param _eventName The bytes32 encoded (hex) representation of the event's name in audit files.
     * @param _isTrue The boolean value in question.
     * @param _id The unique ID that can be matched with the record in the distributed audit file, to match
     * any other information related to this event (e.g. a reason the action was taken).
     * @param _cid The Content ID of the distributed audit file. 
     */
    function emitEvent(bytes32 _eventName, bool _isTrue, uint _id, string calldata _cid) external onlyAdmins {
        emit LogEvent(_eventName, _isTrue, _id, _cid, msg.sender);
        emit LogLatestAudit(_cid);
    }

    /**
     * @dev Emit an event that includes an address as the main value.
     * @notice Example: when a new contract address is added.
     * @param _eventName The bytes32 encoded (hex) representation of the event's name in audit files.
     * @param _account The address of the account in question.
     * @param _id The unique ID that can be matched with the record in the distributed audit file, to match
     * any other information related to this event (e.g. a reason the action was taken).
     * @param _cid The Content ID of the distributed audit file. 
     */
    function emitEvent(bytes32 _eventName, address _account, uint _id, string calldata _cid) external onlyAdmins {
        emit LogEvent(_eventName, _account, _id, _cid, msg.sender);
        emit LogLatestAudit(_cid);
    }

    /**
     * @dev Emit an event that includes an array of addresses as the main values.
     * @notice Example: when a bulk admin add has been performed.
     * @param _eventName The bytes32 encoded (hex) representation of the event's name in audit files.
     * @param _accounts The addresses of the account in question.
     * @param _id The unique ID that can be matched with the record in the distributed audit file, to match
     * any other information related to this event (e.g. a reason the action was taken).
     * @param _cid The Content ID of the distributed audit file. 
     */
    function emitEvent(bytes32 _eventName, address[] calldata _accounts, uint _id, string calldata _cid) external onlyAdmins {
        emit LogEvent(_eventName, _accounts, _id, _cid, msg.sender);
        emit LogLatestAudit(_cid);
    }

    /**
     * @dev Emit an event that includes a number as the main value.
     * @notice Example: when an amount of tokens has been created.
     * @param _eventName The bytes32 encoded (hex) representation of the event's name in audit files.
     * @param _amount The amount in question.
     * @param _id The unique ID that can be matched with the record in the distributed audit file, to match
     * any other information related to this event (e.g. a reason the action was taken).
     * @param _cid The Content ID of the distributed audit file. 
     */
    function emitEvent(bytes32 _eventName, uint _amount, uint _id, string calldata _cid) external onlyAdmins {
        emit LogEvent(_eventName, _amount, _id, _cid, msg.sender);
        emit LogLatestAudit(_cid);
    }

    /**
     * @dev Emit an event that includes an address and a number as the main values.
     * @notice Example: when an award of tokens is given.
     * @param _eventName The bytes32 encoded (hex) representation of the event's name in audit files.
     * @param _account The account in question.
     * @param _amount The amount in question.
     * @param _id The unique ID that can be matched with the record in the distributed audit file, to match
     * any other information related to this event (e.g. a reason the action was taken).
     * @param _cid The Content ID of the distributed audit file. 
     */
    function emitEvent(bytes32 _eventName, address _account, uint _amount, uint _id, string calldata _cid) external onlyAdmins {
        emit LogEvent(_eventName, _account, _amount, _id, _cid, msg.sender);
        emit LogLatestAudit(_cid);
    }

    /**
     * @dev Emit an event that includes an array of addresses and an array of numbers as the main values.
     * @notice Example: when a bulk award of tokens is given.
     * @param _eventName The bytes32 encoded (hex) representation of the event's name in audit files.
     * @param _accounts The accounts in question.
     * @param _amounts The amounts in question.
     * @param _id The unique ID that can be matched with the record in the distributed audit file, to match
     * any other information related to this event (e.g. a reason the action was taken).
     * @param _cid The Content ID of the distributed audit file. 
     */
    function emitEvent(bytes32 _eventName, address[] calldata _accounts, uint[] calldata _amounts, uint _id, string calldata _cid) external onlyAdmins {
        emit LogEvent(_eventName, _accounts, _amounts, _id, _cid, msg.sender);
        emit LogLatestAudit(_cid);
    }

    //
    // Events
    //

    /**
     * @notice We want a single emitted event to record the most recent CID hash
     */
    event LogLatestAudit(
        string cid
    );

    /**
     * @notice For logging `bool` events
     */
    event LogEvent(
        bytes32 indexed eventName,
        bool isTrue,
        uint id,
        string cid,
        address sender
    );

    /**
     * @notice For logging `address` events
     */
    event LogEvent(
        bytes32 indexed eventName,
        address account,
        uint id,
        string cid,
        address sender
    );

    /**
     * @notice For logging `address[]` events
     */
    event LogEvent(
        bytes32 indexed eventName,
        address[] accounts,
        uint id,
        string cid,
        address sender
    );

    /**
     * @notice For logging `uint` events
     */
    event LogEvent(
        bytes32 indexed eventName,
        uint amount,
        uint id,
        string cid,
        address sender
    );

    /**
     * @notice For logging `address` and `uint` events
     */
    event LogEvent(
        bytes32 indexed eventName,
        address account,
        uint amount,
        uint id,
        string cid,
        address sender
    );

    /**
     * @notice For logging an array of `address` and `uint` values in events
     */
    event LogEvent(
        bytes32 indexed eventName,
        address[] accounts,
        uint[] amounts,
        uint id,
        string cid,
        address sender
    );
}