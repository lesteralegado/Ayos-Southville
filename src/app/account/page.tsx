import { redirect } from "next/navigation";
import { getVerifiedResident, hasPilotEligibility } from "@/features/auth/session";
import { getFirebaseAdmin } from "@/lib/firebase/admin";
import { ResidentPanel } from "@/features/auth/resident-panel";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const resident = await getVerifiedResident();
  if (!resident) redirect("/sign-in?next=/account");

  const profile = await getFirebaseAdmin()
    .db.collection("residentProfiles")
    .doc(resident.uid)
    .get();
  const publicAlias = profile.data()?.publicAlias;
  const roles = Array.isArray(profile.data()?.roles)
    ? profile.data()?.roles
    : ["Resident"];
  return (
    <ResidentPanel
      publicAlias={typeof publicAlias === "string" ? publicAlias : "neighbor"}
      roles={roles}
      approved={await hasPilotEligibility(resident)}
    />
  );
}
