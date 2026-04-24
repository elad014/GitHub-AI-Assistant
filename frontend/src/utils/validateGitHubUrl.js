const GITHUB_URL_REGEX = /^https:\/\/github\.com\/[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+(\/.*)?$/

/**
 * @param {string} url
 * @returns {boolean}
 */
export function isValidGitHubUrl(url) {
  return GITHUB_URL_REGEX.test(url)
}
