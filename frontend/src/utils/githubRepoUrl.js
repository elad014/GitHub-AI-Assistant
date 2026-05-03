/**
 * Normalized https URL for a GitHub repo (accepts full URL or "owner/repo").
 * @param {string} repoUrlOrSlug
 * @returns {string}
 */
export function githubRepoWebUrl(repoUrlOrSlug) {
  const raw = (repoUrlOrSlug || '').trim()
  if (!raw) return '#'
  if (/^https?:\/\//i.test(raw)) {
    return raw.replace(/\/+$/, '')
  }
  const slug = raw.replace(/^\/+/, '').replace(/\/+$/, '')
  return `https://github.com/${slug}`
}

/**
 * "owner/repo" from a full GitHub repo URL, or pass-through if already slug.
 * @param {string} repoUrlOrSlug
 * @returns {string}
 */
export function githubRepoSlug(repoUrlOrSlug) {
  const raw = (repoUrlOrSlug || '').trim()
  if (!raw) return ''
  const m = raw.match(/github\.com\/([^/]+\/[^/]+)/i)
  if (m) return m[1].replace(/\/+$/, '')
  return raw.replace(/^\/+/, '').replace(/\/+$/, '')
}
