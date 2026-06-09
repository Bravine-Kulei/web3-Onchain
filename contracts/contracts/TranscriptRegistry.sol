// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./InstitutionRegistry.sol";

contract TranscriptRegistry {
    enum Status { Active, Revoked }

    struct Transcript {
        bytes32 documentHash;
        address issuer;
        address recipient; // receiving institution
        string studentId;
        string program;
        uint256 issuedAt;
        Status status;
    }

    InstitutionRegistry public registry;
    mapping(bytes32 => Transcript) public transcripts; // documentHash => Transcript

    event TranscriptIssued(
        bytes32 indexed documentHash,
        address indexed issuer,
        string studentId,
        string program,
        uint256 timestamp
    );
    event TranscriptRevoked(bytes32 indexed documentHash, address indexed revokedBy);

    constructor(address registryAddress) {
        registry = InstitutionRegistry(registryAddress);
    }

    function issueTranscript(
        bytes32 documentHash,
        address recipient,
        string calldata studentId,
        string calldata program
    ) external {
        require(registry.isIssuer(msg.sender), "Not an authorized issuer");
        require(transcripts[documentHash].issuedAt == 0, "Hash already anchored");

        transcripts[documentHash] = Transcript({
            documentHash: documentHash,
            issuer: msg.sender,
            recipient: recipient,
            studentId: studentId,
            program: program,
            issuedAt: block.timestamp,
            status: Status.Active
        });

        emit TranscriptIssued(documentHash, msg.sender, studentId, program, block.timestamp);
    }

    function revokeTranscript(bytes32 documentHash) external {
        Transcript storage t = transcripts[documentHash];
        require(t.issuedAt != 0, "Transcript not found");
        require(t.issuer == msg.sender, "Only issuer can revoke");
        require(t.status == Status.Active, "Already revoked");

        t.status = Status.Revoked;
        emit TranscriptRevoked(documentHash, msg.sender);
    }

    function verifyTranscript(bytes32 documentHash)
        external
        view
        returns (bool exists, bool revoked, address issuer, string memory studentId, string memory program, uint256 issuedAt)
    {
        Transcript memory t = transcripts[documentHash];
        if (t.issuedAt == 0) {
            return (false, false, address(0), "", "", 0);
        }
        return (true, t.status == Status.Revoked, t.issuer, t.studentId, t.program, t.issuedAt);
    }
}
