export function isReportIndexPending(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const failure = error as { code?: unknown; message?: unknown };
  return (failure.code === 9 || failure.code === "failed-precondition") && typeof failure.message === "string" && /query requires an index/i.test(failure.message);
}

export function ReportIndexPending({ href }: { href: string }) {
  return <main className="admin-page"><div className="admin-shell">
    <h1>Reports are being prepared / Inihahanda ang mga ulat</h1>
    <p role="status">Please try again shortly. Your reports have not been changed. / Subukang muli makalipas ang ilang sandali. Hindi binago ang iyong mga ulat.</p>
    <a className="button button-primary" href={href}>Retry / Subukang muli</a>
  </div></main>;
}
