// Compatibility entry point: use the authenticated retention worker, not an
// independent deletion path that bypasses dry-run and target-pin safeguards.
process.argv.splice(2, 0, "cleanup");
await import("./pilot-operations.mjs");
