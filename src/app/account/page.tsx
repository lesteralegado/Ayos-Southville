import { redirect } from "next/navigation";
import { getVerifiedResident } from "@/features/auth/session";
import { getFirebaseAdmin } from "@/lib/firebase/admin";
import { SignOutButton } from "@/features/auth/sign-out-button";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const resident = await getVerifiedResident();
  if (!resident) redirect("/sign-in?next=/account");

  const profile = await getFirebaseAdmin().db.collection("residentProfiles").doc(resident.uid).get();
  const publicAlias = profile.data()?.publicAlias;
  return <main className="message-page"><div className="message-card"><span className="eyebrow">Resident space</span><h1>Hello, {typeof publicAlias === "string" ? publicAlias : "neighbor"}.</h1><p>Your verified identity stays private. Only your public alias appears beside future community activity.</p><SignOutButton /></div></main>;
}
