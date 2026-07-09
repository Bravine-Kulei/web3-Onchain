import { ethers } from "hardhat";
import { sha256HexFromMetadata } from "../../shared/hash";
import { syncAllAbis, loadAddresses, writeAddresses } from "../../shared/sync-artifacts";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  const Registry = await ethers.getContractFactory("InstitutionRegistry");
  const registry = await Registry.deploy();
  await registry.waitForDeployment();
  const registryAddr = await registry.getAddress();
  console.log("InstitutionRegistry deployed to:", registryAddr);

  const Transcript = await ethers.getContractFactory("TranscriptRegistry");
  const transcript = await Transcript.deploy(registryAddr);
  await transcript.waitForDeployment();
  const transcriptAddr = await transcript.getAddress();
  console.log("TranscriptRegistry deployed to:", transcriptAddr);

  const seededTranscripts: { requestId: string; documentHash: string; status: string }[] = [];

  if (process.env.SEED === "true") {
    const signers = await ethers.getSigners();
    const Role = { None: 0, Issuer: 1, Verifier: 2, Both: 3 };
    await (await registry.addInstitution(signers[1].address, "Kabarak University", Role.Both)).wait();
    await (await registry.addInstitution(signers[2].address, "Laikipia University", Role.Both)).wait();
    await (await registry.addInstitution(signers[3].address, "Mount Kenya University", Role.Both)).wait();
    await (await registry.addInstitution(signers[4].address, "Egerton University", Role.Both)).wait();
    console.log("Seeded 4 institutions");

    const issuer = transcript.connect(signers[1]);
    const seeds = [
      { reqId: "REQ-1001", studentId: "CS/2019/001", program: "BSc Computer Science", recipient: signers[2].address, revoke: false },
      { reqId: "REQ-1002", studentId: "LW/2018/099", program: "LLB Law", recipient: signers[3].address, revoke: true },
    ];
    for (const s of seeds) {
      const documentHash = sha256HexFromMetadata(s.reqId, s.studentId, s.program);
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

  syncAllAbis();

  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);

  writeAddresses(chainId, {
    institutionRegistry: registryAddr,
    transcriptRegistry: transcriptAddr,
    network: network.name,
    deployedAt: new Date().toISOString(),
    ...(seededTranscripts.length > 0 ? { seededTranscripts } : {}),
  });
}

main().catch((e) => { console.error(e); process.exit(1); });
