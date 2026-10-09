import Link from "next/link";

export default function CheckEmailPage() {
  return <main className="message-page"><div className="message-card"><span className="mark">✓</span><h1>Check your inbox</h1><p>Use the verification link we sent before signing in. Your account stays private until verification is complete.</p><Link className="button button-primary" href="/sign-in">Return to sign in</Link></div></main>;
}
