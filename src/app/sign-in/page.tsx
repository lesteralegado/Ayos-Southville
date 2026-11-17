import { AuthPanel } from "@/features/auth/auth-panel";

export default async function SignInPage({ searchParams }: { searchParams?: Promise<{ next?: string | string[] }> }) {
  const next = (await searchParams)?.next;
  return <AuthPanel mode="sign-in" nextPath={typeof next === "string" ? next : undefined} />;
}
