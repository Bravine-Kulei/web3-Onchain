import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

// Copy the compiled ABI artifact into the frontend so the UI never drifts
// from the deployed contracts.
function copyAbi(name: string) {
  const artifact = path.resolve(__dirname, `../artifacts/contracts/${name}.sol/${name}.json`);
  const dest = path.resolve(__dirname, `../../frontend/src/contracts/${name}.json`);
  if (fs.existsSync(artifact)) {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(artifact, dest);
    console.log(`ABI synced → ${dest}`);
  } else {
    console.warn(`Artifact not found for ${name} (run \`npx hardhat compile\` first)`);
  }
}

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  // 1. Deploy InstitutionRegistry
  const Registry = await ethers.getContractFactory("InstitutionRegistry");
  const registry = await Registry.deploy();
  await registry.waitForDeployment();
  const registryAddr = await registry.getAddress();
  console.log("InstitutionRegistry deployed to:", registryAddr);

  // 2. Deploy TranscriptRegistry
  const Transcript = await ethers.getContractFactory("TranscriptRegistry");
  const transcript = await Transcript.deploy(registryAddr);
  await transcript.waitForDeployment();
  const transcriptAddr = await transcript.getAddress();
  console.log("TranscriptRegistry deployed to:", transcriptAddr);

  const seededTranscripts: { requestId: string; documentHash: string; status: string }[] = [];

  // 3. Seed demo institutions + transcripts (localhost only)
  if (process.env.SEED === "true") {
    const signers = await ethers.getSigners();
    const Role = { None: 0, Issuer: 1, Verifier: 2, Both: 3 };
    await (await registry.addInstitution(signers[1].address, "Kabarak University", Role.Both)).wait();
    await (await registry.addInstitution(signers[2].address, "Laikipia University", Role.Both)).wait();
    await (await registry.addInstitution(signers[3].address, "Mount Kenya University", Role.Both)).wait();
    await (await registry.addInstitution(signers[4].address, "Egerton University", Role.Both)).wait();
    console.log("Seeded 4 institutions");

    // Pre-anchor a couple of transcripts as Kabarak (signer #1, an authorized issuer)
    // so the Verifier has VERIFIED and REVOKED records on first load. These are
    // verifiable in the UI via the raw 0x hash path printed below.
    const issuer = transcript.connect(signers[1]);
    const seeds = [
      { reqId: "REQ-1001", studentId: "CS/2019/001", program: "BSc Computer Science", recipient: signers[2].address, revoke: false },
      { reqId: "REQ-1002", studentId: "LW/2018/099", program: "LLB Law", recipient: signers[3].address, revoke: true },
    ];
    for (const s of seeds) {
      const documentHash = ethers.keccak256(ethers.toUtf8Bytes(`${s.reqId}:${s.studentId}:${s.program}`));
      await (await issuer.issueTranscript(documentHash, s.recipient, s.studentId, s.program)).wait();
      let status = "Anchored";
      if (s.revoke) {
        await (await issuer.revokeTranscript(documentHash)).wait();
        status = "Revoked";
      }
      seededTranscripts.push({ requestId: s.reqId, documentHash, status });
      console.log(`Seeded transcript ${s.reqId} (${status}) hash=${documentHash}`);
    }
  }

  // 4. Sync ABIs to the frontend
  copyAbi("InstitutionRegistry");
  copyAbi("TranscriptRegistry");

  // 5. Write addresses to frontend
  const network = await ethers.provider.getNetwork();
  const addresses = {
    institutionRegistry: registryAddr,
    transcriptRegistry: transcriptAddr,
    network: network.name,
    chainId: Number(network.chainId),
    deployedAt: new Date().toISOString(),
    seededTranscripts,
  };

  const outPath = path.resolve(__dirname, "../../frontend/src/contracts/addresses.json");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(addresses, null, 2));
  console.log("Addresses written to frontend:", outPath);
}

main().catch((e) => { console.error(e); process.exit(1); });
