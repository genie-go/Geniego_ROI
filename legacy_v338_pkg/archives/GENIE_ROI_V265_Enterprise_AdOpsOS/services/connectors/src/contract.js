function validateActions(actions) {
  if (!Array.isArray(actions)) return false;
  for (const a of actions) {
    if (!a || typeof a.type !== "string") return false;
    if (a.value === undefined) return false;
  }
  return true;
}
module.exports = { validateActions };
