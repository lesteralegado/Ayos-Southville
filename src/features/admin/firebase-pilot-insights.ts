import "server-only";
import { getDiscoveryModule } from "@/features/reports/firebase-discovery";
import { createPilotInsights } from "./pilot-insights";
export async function getPublicPilotInsights() {
  return createPilotInsights(await getDiscoveryModule().all());
}
