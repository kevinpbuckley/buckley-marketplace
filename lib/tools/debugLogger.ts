export function logDebug(...args: unknown[]) {
  const stamp = new Date().toISOString();
  const text = args.map(a => {
    if (typeof a === 'string') return a;
    try { return JSON.stringify(a); } catch (e) { return String(a); }
  }).join(' ');
  console.log(`[${stamp}] ${text}`);
}

export default { logDebug };
