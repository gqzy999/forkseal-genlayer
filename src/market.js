// Pure helpers for the resolved-market calibration flow. They mirror the
// deterministic checks in contracts/forkseal.py (check_source_url,
// extract_source, the verbatim rules check) so the browser preview and
// the contract agree before a transaction is sent.
export const GAMMA_PREFIX = 'https://gamma-api.polymarket.com/markets/';
export function isAllowedSourceUrl(url) {
  if (typeof url !== 'string') return false;
  const u = url.trim();
  if (u.length > 300 || /\s/.test(u)) return false;
  return u.startsWith(GAMMA_PREFIX) || u.startsWith('https://polymarket.com/event/') || u.startsWith('https://www.polymarket.com/event/');
}
export function extractSource(body) {
  let data = null;
  try { data = JSON.parse(body); } catch { data = null; }
  if (data && typeof data === 'object' && typeof data.description === 'string' && data.description.trim()) {
    return {text: data.description, question: typeof data.question === 'string' ? data.question : ''};
  }
  if (typeof body === 'string' && body.trim()) return {text: body, question: ''};
  throw Error('SOURCE_EMPTY');
}
export function sourceContainsRules(sourceText, rules) {
  return typeof sourceText === 'string' && typeof rules === 'string' && rules.length > 0 && sourceText.includes(rules);
}
export function hasMarketSource(record) {
  return !!(record && typeof record.source_url === 'string' && record.source_url
    && record.source_verified === true && /^[0-9a-f]{64}$/.test(record.source_sha256 || ''));
}
