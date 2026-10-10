export default function LoadingAdministration() {
  return (
    <main className="admin-shell" aria-busy="true">
      <h1>Ayos Southville</h1>
      <p role="status">Loading administration / Binubuksan ang pamamahala…</p>
      <div className="admin-loading" />
      <div className="admin-loading" />
    </main>
  );
}
