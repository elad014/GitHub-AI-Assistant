import { useEffect, useState } from 'react'

/**
 * Renders a GitHub Open Graph banner image, gracefully hiding itself if the
 * upstream host fails (404, 429 rate-limit from opengraph.githubassets.com,
 * network errors, etc.) so the UI doesn't show a broken-image icon.
 *
 * Pass `wrapperClass` (and optional `children`) to also collapse a wrapping
 * element when the image fails.
 */
export default function RepoBannerImage({
  src,
  className,
  alt = '',
  wrapperClass,
  children,
  fallback,
}) {
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setFailed(false)
  }, [src])

  const showFallback = (!src || failed) && fallback

  if (!src && !fallback) return null
  if (failed && !fallback) return null

  const content = showFallback ? (
    fallback
  ) : (
    <img
      className={className}
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  )

  if (!wrapperClass) return content

  return (
    <div className={wrapperClass}>
      {content}
      {children}
    </div>
  )
}
