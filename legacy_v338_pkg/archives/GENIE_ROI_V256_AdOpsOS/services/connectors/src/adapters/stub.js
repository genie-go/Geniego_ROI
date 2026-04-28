async function execute({ execution_id, channel, actions, dry_run, cap }) {
  // Safe stub: returns what *would* be executed.
  return {
    execution_id,
    channel,
    dry_run,
    capabilities: cap,
    actions,
    note: dry_run
      ? "DRY_RUN=true: no external API calls performed."
      : "DRY_RUN=false but adapter is stub: still no external calls. Implement real adapter to enable.",
  };
}

async function rollback({ execution_id, channel, dry_run }) {
  return {
    execution_id,
    channel,
    dry_run,
    note: "Rollback is best-effort. In stub mode, nothing to rollback.",
  };
}

module.exports = { execute, rollback };
