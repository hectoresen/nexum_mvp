import { useState, useEffect, useRef } from 'react'

/**
 * Module-level blob URL cache — persists across re-renders.
 * Keys are the original http(s):// URLs; values are blob: URLs created from fetched bytes.
 * The ?v=N version parameter in avatar URLs acts as a natural cache-buster:
 * a new avatar version gets a new cache key and a fresh fetch.
 */
const blobCache = new Map<string, string>()

interface ServerImageProps {
  /** The raw image URL (http://, https://, data:, or null/undefined). */
  src: string | null | undefined
  alt: string
  className?: string
  /** Rendered while the image is loading or if it fails to load. */
  fallback?: React.ReactNode
}

/**
 * Loads server-hosted images via JavaScript fetch() instead of a raw <img src>.
 *
 * WHY: In Tauri 2 on Windows, WebView2 enforces Chrome's Private Network Access (PNA)
 * policy differently for <img src="http://private-ip/..."> vs fetch(). The CORS preflight
 * path for <img> tags can silently fail even when the server responds correctly, leaving
 * avatars broken for remote (guest) clients. fetch() → blob URL is the reliable path:
 * - The same fetch() code path already works for avatar uploads (POST to private IP).
 * - A blob: URL is same-origin (tauri://localhost), so the final <img> has no CORS issues.
 *
 * For data: and blob: URLs the component renders them directly without fetching.
 */
export default function ServerImage({ src, alt, className, fallback }: ServerImageProps) {
  const [resolvedSrc, setResolvedSrc] = useState<string | null>(() => {
    if (!src) return null
    // data: and blob: are safe to display directly
    if (src.startsWith('data:') || src.startsWith('blob:')) return src
    // Return cached blob URL immediately on first render
    return blobCache.get(src) ?? null
  })

  // Track the current src so async callbacks can bail out if src changed
  const currentSrcRef = useRef(src)
  currentSrcRef.current = src

  useEffect(() => {
    if (!src) {
      setResolvedSrc(null)
      return
    }
    if (src.startsWith('data:') || src.startsWith('blob:')) {
      setResolvedSrc(src)
      return
    }

    const cached = blobCache.get(src)
    if (cached) {
      setResolvedSrc(cached)
      return
    }

    let cancelled = false
    fetch(src, { mode: 'cors', credentials: 'omit' })
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.blob()
      })
      .then(blob => {
        if (cancelled) return
        const blobUrl = URL.createObjectURL(blob)
        blobCache.set(src, blobUrl)
        if (currentSrcRef.current === src) setResolvedSrc(blobUrl)
      })
      .catch(() => {
        if (!cancelled && currentSrcRef.current === src) setResolvedSrc(null)
      })

    return () => {
      cancelled = true
    }
  }, [src])

  if (!resolvedSrc) return <>{fallback ?? null}</>
  return <img src={resolvedSrc} alt={alt} className={className} />
}
