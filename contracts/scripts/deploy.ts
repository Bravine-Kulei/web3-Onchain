import { ethers } from "hardhat";
import { sha256HexFromMetadata } from "../../shared/hash";
import { syncAllAbis, writeAddresses } from "../../shared/sync-artifacts";
import { LOCAL_SEED_INSTITUTIONS } from "./local-seed";

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);
  const isAmoy = chainId === 80002;
  const isLocal = chainId === 31337;

  if (isAmoy && !process.env.PRIVATE_KEY) {
    console.error("Amoy deploy requires PRIVATE_KEY in root .env or contracts/.env");
    process.exit(1);
  }

  if (process.env.SEED === "true" && isAmoy) {
    console.warn("SEED=true is for localhost only (needs multiple Hardhat accounts). Skipping seed on Amoy.");
  }

  const Registry = await ethers.getContractFactory("InstitutionRegistry");
  const registry = await Registry.deploy();
  await registry.waitForDeployment();
  const registryAddr = await registry.getAddress();

  const Transcript = await ethers.getContractFactory("TranscriptRegistry");
  const transcript = await Transcript.deploy(registryAddr);
  await transcript.waitForDeployment();
  const transcriptAddr = await transcript.getAddress();
  const seededInstitutions: { wallet: string; name: string; role: string }[] = [];
  const seededTranscripts: { requestId: string; documentHash: string; status: string }[] = [];

  if (process.env.SEED === "true" && isLocal) {
    const signers = await ethers.getSigners();
    if (signers.length < 5) throw new Error("Local seed requires at least 5 deterministic Hardhat accounts");
    const Role = { None: 0, Issuer: 1, Verifier: 2, Both: 3 };
    for (const institution of LOCAL_SEED_INSTITUTIONS) {
      const signer = signers[institution.signerIndex];
      await (await registry.addInstitution(signer.address, institution.name, Role[institution.role])).wait();
      seededInstitutions.push({ wallet: signer.address, name: institution.name, role: institution.role });
    }

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
    }
  }

  console.log(`Chain ID: ${chainId}`);
  console.log(`Admin/deployer: ${deployer.address}`);
  console.log(`Institution registry: ${registryAddr}`);
  console.log(`Transcript registry: ${transcriptAddr}`);
  for (const institution of seededInstitutions) {
    console.log(`Seeded issuer: ${institution.wallet} -> ${institution.name} (${institution.role})`);
  }
  for (const seeded of seededTranscripts) {
    console.log(`Seeded transcript: ${seeded.requestId} -> ${seeded.documentHash} (${seeded.status})`);
  }

  syncAllAbis();
  writeAddresses(chainId, {
    institutionRegistry: registryAddr,
    transcriptRegistry: transcriptAddr,
    network: network.name,
    deployedAt: new Date().toISOString(),
    ...(seededInstitutions.length > 0 ? { seededInstitutions } : {}),
    ...(seededTranscripts.length > 0 ? { seededTranscripts } : {}),
  });

  if (isAmoy) {
    console.log("\nAmoy deploy complete. Next steps:");
    console.log("  1. Set VITE_CHAIN=amoy in root .env");
    console.log("  2. Add institutions via Admin UI (deployer wallet is admin)");
    console.log("  3. Fund issuer wallets with Amoy MATIC: https://faucet.polygon.technology");
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
