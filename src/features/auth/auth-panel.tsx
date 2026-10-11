"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useState } from "react";
import { createUserWithEmailAndPassword, deleteUser, sendEmailVerification, signInWithEmailAndPassword, signOut, updateProfile } from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { useLocale } from "@/features/i18n/use-locale";
import { getFirebaseClient, getSessionlessAuth } from "@/lib/firebase/client";

type AuthPanelProps = {
  mode: "register" | "sign-in";
};

const authCopy = {
  en: {
    registerTitle: "Join the resident pilot",
    signInTitle: "Welcome back",
    registerLead: "Create a verified account to report concerns and follow progress.",
    signInLead: "Sign in to see your reports and resident-only actions.",
    email: "Email address",
    alias: "Public alias",
    password: "Password",
    privacy: "Your email stays private. Neighbors will only see your public alias.",
    registerAction: "Create account",
    signInAction: "Sign in",
    registerSwitch: "Already a member? Sign in",
    signInSwitch: "New to the pilot? Create an account",
    language: "Filipino",
    pilotKicker: "Southville 1 · Resident-led pilot",
    introBefore: "Progress starts with",
    introAccent: "being heard.",
    introLead: "Verified accounts help keep community reports useful while your private identity stays protected.",
    pending: "Please wait…",
  },
  fil: {
    registerTitle: "Sumali sa pilot ng mga residente",
    signInTitle: "Maligayang pagbabalik",
    registerLead: "Gumawa ng verified account upang mag-ulat at sumubaybay ng progreso.",
    signInLead: "Mag-sign in upang makita ang iyong mga ulat at resident-only na gawain.",
    email: "Email address",
    alias: "Pampublikong alias",
    password: "Password",
    privacy: "Mananatiling pribado ang email mo. Pampublikong alias lang ang makikita ng mga kapitbahay.",
    registerAction: "Gumawa ng account",
    signInAction: "Mag-sign in",
    registerSwitch: "May account na? Mag-sign in",
    signInSwitch: "Bago sa pilot? Gumawa ng account",
    language: "English",
    pilotKicker: "Southville 1 · Pilot ng mga residente",
    introBefore: "Nagsisimula ang progreso sa",
    introAccent: "pakikinig.",
    introLead: "Tumutulong ang verified accounts na manatiling kapaki-pakinabang ang mga ulat habang protektado ang iyong pribadong pagkakakilanlan.",
    pending: "Sandali lang…",
  },
} as const;

export function AuthPanel({ mode }: AuthPanelProps) {
  const router = useRouter();
  const { locale, chooseLocale } = useLocale();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const copy = authCopy[locale];
  const isRegister = mode === "register";

  function toggleLocale() {
    const next = locale === "en" ? "fil" : "en";
    chooseLocale(next);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const password = String(formData.get("password") ?? "");
    try {
      const auth = await getSessionlessAuth();
      if (isRegister) {
        const publicAlias = String(formData.get("publicAlias") ?? "").trim();
        const credential = await createUserWithEmailAndPassword(auth, email, password);
        const profileRef = doc(getFirebaseClient().db, "residentProfiles", credential.user.uid);
        try {
          await updateProfile(credential.user, { displayName: publicAlias });
          await sendEmailVerification(credential.user, { url: `${window.location.origin}/sign-in` });
          await setDoc(profileRef, { publicAlias, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
        } catch (registrationError) {
          await deleteUser(credential.user).catch(() => undefined);
          throw registrationError;
        }
        await signOut(auth);
        router.push(`/register/check-email?email=${encodeURIComponent(email)}`);
      } else {
        const credential = await signInWithEmailAndPassword(auth, email, password);
        if (!credential.user.emailVerified) {
          await sendEmailVerification(credential.user, { url: `${window.location.origin}/sign-in` });
          await signOut(auth);
          setError(locale === "fil" ? "I-verify muna ang email. Nagpadala kami ng bagong link." : "Verify your email first. We sent a new link.");
          return;
        }
        const idToken = await credential.user.getIdToken(true);
        const response = await fetch("/api/session", { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify({ idToken }) });
        await signOut(auth);
        if (!response.ok) throw new Error("Session creation failed");
        router.push("/account");
        router.refresh();
      }
    } catch {
      setError(locale === "fil" ? "Hindi natuloy. Suriin ang detalye at subukan muli." : "That did not work. Check your details and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-intro">
        <Link className="brand brand-light" href="/">Ayos Southville</Link>
        <div>
          <span className="panel-kicker">{copy.pilotKicker}</span>
          <h1>{copy.introBefore} <em>{copy.introAccent}</em></h1>
          <p>{copy.introLead}</p>
        </div>
      </section>
      <section className="auth-form-wrap">
        <button className="language-button auth-language" type="button" onClick={toggleLocale}>{copy.language}</button>
        <div className="auth-form-card">
          <span className="eyebrow">Ayos Southville</span>
          <h2>{isRegister ? copy.registerTitle : copy.signInTitle}</h2>
          <p>{isRegister ? copy.registerLead : copy.signInLead}</p>
          <form onSubmit={submit}>
            <label htmlFor={`${mode}-email`}>{copy.email}</label>
            <input id={`${mode}-email`} name="email" type="email" autoComplete="email" required />
            {isRegister && <><label htmlFor="public-alias">{copy.alias}</label><input id="public-alias" name="publicAlias" type="text" autoComplete="nickname" minLength={3} maxLength={32} required /></>}
            <label htmlFor={`${mode}-password`}>{copy.password}</label>
            <input id={`${mode}-password`} name="password" type="password" autoComplete={isRegister ? "new-password" : "current-password"} minLength={8} required />
            {isRegister && <p className="privacy-note">{copy.privacy}</p>}
            {isRegister && <Link href="/privacy">{locale === "fil" ? "Patakaran sa privacy, retention at pagbura" : "Privacy, retention and deletion policy"}</Link>}
            <p className="form-error" role="alert" aria-live="polite">{error}</p>
            <button className="button button-primary auth-submit" type="submit" disabled={pending}>{pending ? copy.pending : isRegister ? copy.registerAction : copy.signInAction}</button>
          </form>
          <Link className="auth-switch" href={isRegister ? "/sign-in" : "/register"}>{isRegister ? copy.registerSwitch : copy.signInSwitch}</Link>
        </div>
      </section>
    </main>
  );
}
