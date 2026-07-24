import { expect } from "chai";
import { ethers } from "hardhat";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { sha256HexFromMetadata } from "../../shared/hash";
import { writeAddressesFile } from "../../shared/sync-artifacts";
import { LOCAL_SEED_INSTITUTIONS } from "../scripts/local-seed";
import { InstitutionRegistry, TranscriptRegistry } from "../typechain-types";

describe("local deployment metadata", function () {
  it("keeps deterministic signer indices, institution names, and roles in output order", function () {
    expect(LOCAL_SEED_INSTITUTIONS).to.deep.equal([
      { signerIndex: 1, name: "Kabarak University", role: "Both" },
      { signerIndex: 2, name: "Laikipia University", role: "Both" },
      { signerIndex: 3, name: "Mount Kenya University", role: "Both" },
      { signerIndex: 4, name: "Egerton University", role: "Both" },
    ]);
  });

  it("maps deterministic Hardhat wallets to emitted seeded institution metadata", async function () {
    const signers = await ethers.getSigners();
    const expected = LOCAL_SEED_INSTITUTIONS.map((institution) => ({
      wallet: signers[institution.signerIndex].address,
      name: institution.name,
      role: institution.role,
    }));
    const addressesPath = path.resolve(__dirname, "../../frontend/src/contracts/addresses.json");
    const addresses = JSON.parse(fs.readFileSync(addressesPath, "utf8"));

    expect(addresses["31337"].seededInstitutions).to.deep.equal(expected);
  });

  it("preserves other chains and atomically replaces the selected address entry", function () {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "transcrypt-addresses-"));
    const addressesPath = path.join(directory, "addresses.json");
    const existing = {
      "80002": {
        institutionRegistry: "0x1111111111111111111111111111111111111111",
        transcriptRegistry: "0x2222222222222222222222222222222222222222",
        network: "amoy",
        deployedAt: "existing",
      },
    };
    fs.writeFileSync(addressesPath, JSON.stringify(existing));

    writeAddressesFile(addressesPath, 31337, {
      institutionRegistry: "0x3333333333333333333333333333333333333333",
      transcriptRegistry: "0x4444444444444444444444444444444444444444",
      network: "localhost",
      deployedAt: "new",
    });

    expect(JSON.parse(fs.readFileSync(addressesPath, "utf8"))).to.deep.equal({
      ...existing,
      "31337": {
        institutionRegistry: "0x3333333333333333333333333333333333333333",
        transcriptRegistry: "0x4444444444444444444444444444444444444444",
        network: "localhost",
        deployedAt: "new",
      },
    });
    expect(fs.readdirSync(directory)).to.deep.equal(["addresses.json"]);
    fs.rmSync(directory, { recursive: true, force: true });
  });

  it("backs up malformed address JSON exactly and writes the active deployment", function () {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "transcrypt-corrupt-addresses-"));
    const addressesPath = path.join(directory, "addresses.json");
    const corrupt = '{"31337":{"institutionRegistry":"truncated"';
    const warnings: string[] = [];
    fs.writeFileSync(addressesPath, corrupt, "utf8");

    const result = writeAddressesFile(addressesPath, 31337, {
      institutionRegistry: "0x3333333333333333333333333333333333333333",
      transcriptRegistry: "0x4444444444444444444444444444444444444444",
      network: "localhost",
      deployedAt: "new",
    }, { now: () => 1234, warn: (message) => warnings.push(message) });

    expect(result.corruptBackupPath).to.equal(`${addressesPath}.corrupt-1234.bak`);
    expect(fs.readFileSync(result.corruptBackupPath!, "utf8")).to.equal(corrupt);
    expect(JSON.parse(fs.readFileSync(addressesPath, "utf8"))["31337"].network).to.equal("localhost");
    expect(warnings.join(" ")).to.contain(result.corruptBackupPath);
    expect(fs.readdirSync(directory).some((name) => name.endsWith(".tmp"))).to.be.false;
    fs.rmSync(directory, { recursive: true, force: true });
  });

  it("rolls back the exact original when atomic replacement fails", function () {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "transcrypt-rollback-addresses-"));
    const addressesPath = path.join(directory, "addresses.json");
    const original = '{"80002":{"network":"amoy"}}\n';
    let renames = 0;
    fs.writeFileSync(addressesPath, original, "utf8");

    expect(() => writeAddressesFile(addressesPath, 31337, {
      institutionRegistry: "0x3333333333333333333333333333333333333333",
      transcriptRegistry: "0x4444444444444444444444444444444444444444",
      network: "localhost",
      deployedAt: "new",
    }, {
      renameSync: (from, to) => {
        renames += 1;
        if (renames === 2) throw new Error("simulated replace failure");
        fs.renameSync(from, to);
      },
    })).to.throw("original restored");

    expect(fs.readFileSync(addressesPath, "utf8")).to.equal(original);
    expect(fs.readdirSync(directory)).to.deep.equal(["addresses.json"]);
    fs.rmSync(directory, { recursive: true, force: true });
  });
});

describe("generated contract artifacts", function () {
  it("keeps the frontend TranscriptRegistry artifact identical to the compiled artifact", function () {
    const compiledPath = path.resolve(__dirname, "../artifacts/contracts/TranscriptRegistry.sol/TranscriptRegistry.json");
    const frontendPath = path.resolve(__dirname, "../../frontend/src/contracts/TranscriptRegistry.json");
    const compiled = JSON.parse(fs.readFileSync(compiledPath, "utf8"));
    const frontend = JSON.parse(fs.readFileSync(frontendPath, "utf8"));
    const errorNames = compiled.abi.filter((entry: { type: string }) => entry.type === "error")
      .map((entry: { name: string }) => entry.name);

    expect(errorNames).to.include.members(["InvalidDocumentHash", "ZeroAddress"]);
    expect(frontend).to.deep.equal(compiled);
  });
});

describe("InstitutionRegistry", function () {
  let registry: InstitutionRegistry;
  let admin: Awaited<ReturnType<typeof ethers.getSigners>>[0];
  let issuer: Awaited<ReturnType<typeof ethers.getSigners>>[1];
  let other: Awaited<ReturnType<typeof ethers.getSigners>>[2];

  const Role = { None: 0, Issuer: 1, Verifier: 2, Both: 3 };

  beforeEach(async function () {
    [admin, issuer, , other] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("InstitutionRegistry");
    registry = await Factory.deploy();
    await registry.waitForDeployment();
  });

  it("sets deployer as admin", async function () {
    expect(await registry.admin()).to.equal(admin.address);
  });

  it("allows admin to add institution", async function () {
    await expect(registry.addInstitution(issuer.address, "Kabarak University", Role.Both))
      .to.emit(registry, "InstitutionAdded")
      .withArgs(issuer.address, "Kabarak University", Role.Both);
    expect(await registry.isIssuer(issuer.address)).to.be.true;
    expect(await registry.isVerifier(issuer.address)).to.be.true;
  });

  it("reverts when non-admin adds institution", async function () {
    await expect(
      registry.connect(other).addInstitution(issuer.address, "Test", Role.Issuer)
    ).to.be.revertedWithCustomError(registry, "NotAdmin");
  });

  it("reverts on duplicate active registration", async function () {
    await registry.addInstitution(issuer.address, "Kabarak University", Role.Both);
    await expect(
      registry.addInstitution(issuer.address, "Kabarak University", Role.Both)
    ).to.be.revertedWithCustomError(registry, "AlreadyRegistered");
  });

  it("reverts on zero address", async function () {
    await expect(
      registry.addInstitution(ethers.ZeroAddress, "Test", Role.Issuer)
    ).to.be.revertedWithCustomError(registry, "ZeroAddress");
  });

  it("deactivates active institution", async function () {
    await registry.addInstitution(issuer.address, "Kabarak University", Role.Both);
    await expect(registry.deactivate(issuer.address))
      .to.emit(registry, "InstitutionDeactivated")
      .withArgs(issuer.address);
    expect(await registry.isIssuer(issuer.address)).to.be.false;
  });

  it("reverts deactivate on unknown or inactive address", async function () {
    await expect(registry.deactivate(issuer.address)).to.be.revertedWithCustomError(registry, "NotRegistered");
    await registry.addInstitution(issuer.address, "Kabarak University", Role.Both);
    await registry.deactivate(issuer.address);
    await expect(registry.deactivate(issuer.address)).to.be.revertedWithCustomError(registry, "NotRegistered");
  });

  it("allows re-activation of deactivated institution", async function () {
    await registry.addInstitution(issuer.address, "Kabarak University", Role.Both);
    await registry.deactivate(issuer.address);
    await registry.addInstitution(issuer.address, "Kabarak University", Role.Issuer);
    expect(await registry.isIssuer(issuer.address)).to.be.true;
    expect(await registry.isVerifier(issuer.address)).to.be.false;
    const all = await registry.getAll();
    expect(all.length).to.equal(1);
  });

  it("respects role flags when active", async function () {
    await registry.addInstitution(issuer.address, "Verifier Only", Role.Verifier);
    expect(await registry.isVerifier(issuer.address)).to.be.true;
    expect(await registry.isIssuer(issuer.address)).to.be.false;
  });
});

describe("TranscriptRegistry", function () {
  let registry: InstitutionRegistry;
  let transcript: TranscriptRegistry;
  let issuer: Awaited<ReturnType<typeof ethers.getSigners>>[1];
  let recipient: Awaited<ReturnType<typeof ethers.getSigners>>[2];
  let other: Awaited<ReturnType<typeof ethers.getSigners>>[3];

  const Role = { None: 0, Issuer: 1, Verifier: 2, Both: 3 };
  const docHash = sha256HexFromMetadata("REQ-1001", "CS/2019/001", "BSc Computer Science");

  beforeEach(async function () {
    [, issuer, recipient, other] = await ethers.getSigners();
    const RegistryFactory = await ethers.getContractFactory("InstitutionRegistry");
    registry = await RegistryFactory.deploy();
    await registry.waitForDeployment();

    const TranscriptFactory = await ethers.getContractFactory("TranscriptRegistry");
    transcript = await TranscriptFactory.deploy(await registry.getAddress());
    await transcript.waitForDeployment();

    await registry.addInstitution(issuer.address, "Kabarak University", Role.Both);
  });

  it("reverts deploy with zero registry address", async function () {
    const TranscriptFactory = await ethers.getContractFactory("TranscriptRegistry");
    await expect(TranscriptFactory.deploy(ethers.ZeroAddress)).to.be.revertedWithCustomError(
      { interface: transcript.interface },
      "ZeroAddress"
    );
  });

  it("allows authorized issuer to issue transcript", async function () {
    await expect(
      transcript.connect(issuer).issueTranscript(docHash, recipient.address, "CS/2019/001", "BSc Computer Science")
    ).to.emit(transcript, "TranscriptIssued");

    const [exists, revoked, onChainIssuer, studentId, program] = await transcript.verifyTranscript(docHash);
    expect(exists).to.be.true;
    expect(revoked).to.be.false;
    expect(onChainIssuer).to.equal(issuer.address);
    expect(studentId).to.equal("CS/2019/001");
    expect(program).to.equal("BSc Computer Science");
  });

  it("reverts when unauthorized wallet issues", async function () {
    await expect(
      transcript.connect(other).issueTranscript(docHash, recipient.address, "CS/2019/001", "BSc Computer Science")
    ).to.be.revertedWithCustomError(transcript, "NotAnAuthorizedIssuer");
  });

  it("reverts when document hash is zero", async function () {
    await expect(
      transcript.connect(issuer).issueTranscript(
        ethers.ZeroHash,
        recipient.address,
        "CS/2019/001",
        "BSc Computer Science"
      )
    ).to.be.revertedWithCustomError(transcript, "InvalidDocumentHash");
  });

  it("reverts when recipient is zero", async function () {
    await expect(
      transcript.connect(issuer).issueTranscript(
        docHash,
        ethers.ZeroAddress,
        "CS/2019/001",
        "BSc Computer Science"
      )
    ).to.be.revertedWithCustomError(transcript, "ZeroAddress");
  });

  it("reverts on double issue", async function () {
    await transcript.connect(issuer).issueTranscript(docHash, recipient.address, "CS/2019/001", "BSc Computer Science");
    await expect(
      transcript.connect(issuer).issueTranscript(docHash, recipient.address, "CS/2019/001", "BSc Computer Science")
    ).to.be.revertedWithCustomError(transcript, "HashAlreadyAnchored");
  });

  it("reverts when deactivated issuer tries to issue", async function () {
    await registry.deactivate(issuer.address);
    await expect(
      transcript.connect(issuer).issueTranscript(docHash, recipient.address, "CS/2019/001", "BSc Computer Science")
    ).to.be.revertedWithCustomError(transcript, "NotAnAuthorizedIssuer");
  });

  it("allows issuer to revoke and blocks double revoke", async function () {
    await transcript.connect(issuer).issueTranscript(docHash, recipient.address, "CS/2019/001", "BSc Computer Science");
    await expect(transcript.connect(issuer).revokeTranscript(docHash))
      .to.emit(transcript, "TranscriptRevoked")
      .withArgs(docHash, issuer.address);

    const [, revoked] = await transcript.verifyTranscript(docHash);
    expect(revoked).to.be.true;

    await expect(transcript.connect(issuer).revokeTranscript(docHash)).to.be.revertedWithCustomError(
      transcript,
      "AlreadyRevoked"
    );
  });

  it("reverts revoke by non-issuer", async function () {
    await transcript.connect(issuer).issueTranscript(docHash, recipient.address, "CS/2019/001", "BSc Computer Science");
    await expect(transcript.connect(other).revokeTranscript(docHash)).to.be.revertedWithCustomError(
      transcript,
      "OnlyIssuerCanRevoke"
    );
  });

  it("returns empty verify result for missing hash", async function () {
    const missing = sha256HexFromMetadata("missing", "x", "y");
    const [exists, revoked, onChainIssuer, studentId, program, issuedAt] = await transcript.verifyTranscript(missing);
    expect(exists).to.be.false;
    expect(revoked).to.be.false;
    expect(onChainIssuer).to.equal(ethers.ZeroAddress);
    expect(studentId).to.equal("");
    expect(program).to.equal("");
    expect(issuedAt).to.equal(0n);
  });

  it("reverts revoke on missing transcript", async function () {
    const missing = sha256HexFromMetadata("missing", "x", "y");
    await expect(transcript.connect(issuer).revokeTranscript(missing)).to.be.revertedWithCustomError(
      transcript,
      "TranscriptNotFound"
    );
  });
});
