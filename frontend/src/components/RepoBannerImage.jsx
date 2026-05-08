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
}) {
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setFailed(false)
  }, [src])

  if (!src || failed) return null

  const img = (
    <img
      className={className}
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  )

  if (!wrapperClass) return img

  return (
    <div className={wrapperClass}>
      {img}
      {children}
    </div>
  )
}
