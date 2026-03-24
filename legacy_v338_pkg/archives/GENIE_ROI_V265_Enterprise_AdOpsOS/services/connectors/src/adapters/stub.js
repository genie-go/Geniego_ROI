async function execute({ execution_id, channel, actions, dry_run, cap }) {
  return {
    execution_id, channel, dry_run,
    capabilities: cap,
    actions,
    note: dry_run
      ? "DRY_RUN=true: no external API calls performed."
      : "DRY_RUN=false but adapter is stub: still no external calls. Implement real adapter to enable.",
  };
}
async function rollback({ execution_id, channel, dry_run }) {
  return { execution_id, channel, dry_run, note: "Rollback best-effort. Stub: nothing to rollback." };
}
module.exports = { execute, rollback };
