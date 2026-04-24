const GITHUB_REPO_PATTERN = /^https:\/\/github\.com\/[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+(\/.*)?$/

/**
 * Returns true only if `url` matches the expected GitHub repository URL shape:
 * https://github.com/<owner>/<repo>[/anything]
 * @param {string} url
 * @returns {boolean}
 */
export function isValidGitHubUrl(url) {
  return GITHUB_REPO_PATTERN.test(url.trim())
}
