import { syncAllAbis } from "../../shared/sync-artifacts";

async function main() {
  syncAllAbis();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
