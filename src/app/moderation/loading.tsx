export default function Loading() {
  return (
    <main className="admin-page">
      <div className="admin-shell" role="status" aria-live="polite">
        <h1>Report operations / Pamamahala ng mga ulat</h1>
        <p>Loading private workspace… / Nilo-load ang pribadong workspace…</p>
        <div className="operator-loading" aria-hidden="true" />
      </div>
    </main>
  );
}
