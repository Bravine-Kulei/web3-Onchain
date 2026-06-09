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

    address public admin;
    mapping(address => Institution) public institutions;
    address[] public institutionList;

    event InstitutionAdded(address indexed addr, string name, Role role);
    event InstitutionDeactivated(address indexed addr);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Not admin");
        _;
    }

    modifier onlyInstitution() {
        require(institutions[msg.sender].active, "Not a registered institution");
        _;
    }

    constructor() {
        admin = msg.sender;
    }

    function addInstitution(address addr, string calldata name, Role role) external onlyAdmin {
        require(!institutions[addr].active, "Already registered");
        institutions[addr] = Institution(name, role, true, block.timestamp);
        institutionList.push(addr);
        emit InstitutionAdded(addr, name, role);
    }

    function deactivate(address addr) external onlyAdmin {
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
