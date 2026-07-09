// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract InstitutionRegistry {
    enum Role { None, Issuer, Verifier, Both }

    struct Institution {
        string name;
        Role role;
        bool active;
        uint256 joinedAt;
    }

    error ZeroAddress();
    error NotAdmin();
    error AlreadyRegistered();
    error NotRegistered();
    error StringTooLong();

    uint256 public constant MAX_NAME_LENGTH = 128;

    address public admin;
    mapping(address => Institution) public institutions;
    address[] public institutionList;

    event InstitutionAdded(address indexed addr, string name, Role role);
    event InstitutionDeactivated(address indexed addr);

    modifier onlyAdmin() {
        if (msg.sender != admin) revert NotAdmin();
        _;
    }

    constructor() {
        admin = msg.sender;
    }

    function addInstitution(address addr, string calldata name, Role role) external onlyAdmin {
        if (addr == address(0)) revert ZeroAddress();
        if (bytes(name).length == 0 || bytes(name).length > MAX_NAME_LENGTH) revert StringTooLong();
        if (institutions[addr].active) revert AlreadyRegistered();

        bool isNew = institutions[addr].joinedAt == 0;
        institutions[addr] = Institution(name, role, true, isNew ? block.timestamp : institutions[addr].joinedAt);
        if (isNew) {
            institutionList.push(addr);
        }
        emit InstitutionAdded(addr, name, role);
    }

    function deactivate(address addr) external onlyAdmin {
        if (!institutions[addr].active) revert NotRegistered();
        institutions[addr].active = false;
        emit InstitutionDeactivated(addr);
    }

    function isIssuer(address addr) external view returns (bool) {
        Institution memory i = institutions[addr];
        return i.active && (i.role == Role.Issuer || i.role == Role.Both);
    }

    function isVerifier(address addr) external view returns (bool) {
        Institution memory i = institutions[addr];
        return i.active && (i.role == Role.Verifier || i.role == Role.Both);
    }

    function getAll() external view returns (address[] memory) {
        return institutionList;
    }
}
