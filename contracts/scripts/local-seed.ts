// deploy.ts resolves these indices to Hardhat wallets and regenerates frontend seededInstitutions metadata.
export const LOCAL_SEED_INSTITUTIONS = [
  { signerIndex: 1, name: "Kabarak University", role: "Both" },
  { signerIndex: 2, name: "Laikipia University", role: "Both" },
  { signerIndex: 3, name: "Mount Kenya University", role: "Both" },
  { signerIndex: 4, name: "Egerton University", role: "Both" },
] as const;
