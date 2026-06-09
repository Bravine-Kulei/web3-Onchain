import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

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

  // 3. Seed demo institutions (localhost only)
  if (process.env.SEED === "true") {
    const signers = await ethers.getSigners();
    const Role = { None: 0, Issuer: 1, Verifier: 2, Both: 3 };
    await registry.addInstitution(signers[1].address, "Kabarak University", Role.Both);
    await registry.addInstitution(signers[2].address, "Laikipia University", Role.Both);
    await registry.addInstitution(signers[3].address, "Mount Kenya University", Role.Both);
    await registry.addInstitution(signers[4].address, "Egerton University", Role.Both);
    console.log("Seeded 4 institutions");
  }

  // 4. Write addresses to frontend
  const addresses = {
    institutionRegistry: registryAddr,
    transcriptRegistry: transcriptAddr,
    network: (await ethers.provider.getNetwork()).name,
    chainId: Number((await ethers.provider.getNetwork()).chainId),
    deployedAt: new Date().toISOString(),
  };

  const outPath = path.resolve(__dirname, "../../frontend/src/contracts/addresses.json");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(addresses, null, 2));
  console.log("Addresses written to frontend:", outPath);
}

main().catch((e) => { console.error(e); process.exit(1); });
