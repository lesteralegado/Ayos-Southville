"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="admin-page">
      <div className="admin-shell">
        <h1>Workspace unavailable / Hindi available ang workspace</h1>
        <p role="alert">
          Private reports could not be loaded. Reconnect and retry. / Hindi
          ma-load ang pribadong ulat. Kumonekta at subukang muli.
        </p>
        <button className="button button-primary" type="button" onClick={reset}>
          Retry / Subukang muli
        </button>
        <a href="/account">My account / Aking account</a>
      </div>
    </main>
  );
}
