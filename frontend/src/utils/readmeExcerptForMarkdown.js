/**
 * GitHub README excerpts are often a mix of Markdown and raw HTML.
 * react-markdown does not parse raw HTML by default, so tags like <br> show as text.
 * Normalize the most common line-break tags to newlines before Markdown render.
 * @param {string} raw
 * @returns {string}
 */
export function readmeExcerptForMarkdown(raw) {
  if (!raw) return ''
  let s = String(raw)
  // Invalid but common: </br>
  s = s.replace(/<\s*\/\s*br\s*>/gi, '\n')
  s = s.replace(/<\s*br\s*\/?\s*>/gi, '\n')
  return s
}
