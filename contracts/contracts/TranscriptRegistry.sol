// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./InstitutionRegistry.sol";

contract TranscriptRegistry {
    enum Status { Active, Revoked }

    struct Transcript {
        bytes32 documentHash;
        address issuer;
        address recipient;
        string studentId;
        string program;
        uint256 issuedAt;
        Status status;
    }

    error ZeroAddress();
    error InvalidDocumentHash();
    error NotAnAuthorizedIssuer();
    error HashAlreadyAnchored();
    error TranscriptNotFound();
    error OnlyIssuerCanRevoke();
    error AlreadyRevoked();
    error StringTooLong();

    uint256 public constant MAX_STRING_LENGTH = 64;

    InstitutionRegistry public registry;
    mapping(bytes32 => Transcript) public transcripts;

    event TranscriptIssued(
        bytes32 indexed documentHash,
        address indexed issuer,
        string studentId,
        string program,
        uint256 timestamp
    );
    event TranscriptRevoked(bytes32 indexed documentHash, address indexed revokedBy);

    constructor(address registryAddress) {
        if (registryAddress == address(0)) revert ZeroAddress();
        registry = InstitutionRegistry(registryAddress);
    }

    function issueTranscript(
        bytes32 documentHash,
        address recipient,
        string calldata studentId,
        string calldata program
    ) external {
        if (!registry.isIssuer(msg.sender)) revert NotAnAuthorizedIssuer();
        if (documentHash == bytes32(0)) revert InvalidDocumentHash();
        if (recipient == address(0)) revert ZeroAddress();
        if (transcripts[documentHash].issuedAt != 0) revert HashAlreadyAnchored();
        if (bytes(studentId).length == 0 || bytes(studentId).length > MAX_STRING_LENGTH) revert StringTooLong();
        if (bytes(program).length == 0 || bytes(program).length > MAX_STRING_LENGTH) revert StringTooLong();

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
        if (t.issuedAt == 0) revert TranscriptNotFound();
        if (t.issuer != msg.sender) revert OnlyIssuerCanRevoke();
        if (t.status == Status.Revoked) revert AlreadyRevoked();

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
