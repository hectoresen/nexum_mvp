import { useState, useEffect, useRef } from 'react'
import { invoke } from '@tauri-apps/api/core'

/**
 * Module-level data-URL cache — persists across re-renders.
 * Keys are the original http(s):// URLs (including ?v=N cache-buster).
 * Values are `data:<mime>;base64,...` strings returned by the Tauri backend.
 */
const dataUrlCache = new Map<string, string>()

interface ServerImageProps {
  /** The raw image URL (http://, https://, data:, or null/undefined). */
  src: string | null | undefined
  alt: string
  className?: string
  /** Rendered while the image is loading or if it fails to load. */
  fallback?: React.ReactNode
}

/**
 * Loads server-hosted images via the Tauri Rust backend instead of the WebView.
 *
 * WHY: Tauri 2 on Windows uses WebView2 (Chromium). Chrome enforces Private Network
 * Access (PNA) policy for requests from tauri://localhost to RFC-1918 addresses
 * (192.168.x.x, 10.x.x.x). For simple GET requests (image loads) WebView2 sends the
 * PNA preflight but the resulting behaviour is unreliable — even a correctly configured
 * server cannot be relied upon to unblock the load. This affects both raw <img src> and
 * WebView2 fetch() for GET requests.
 *
 * Solution: invoke 'fetch_remote_image' — a Tauri command that uses Rust's `reqwest`
 * crate to fetch image bytes outside WebView2's network stack. reqwest has no PNA
 * restrictions. The bytes are returned as a `data:<mime>;base64,...` URL which the
 * WebView renders without making any network request.
 *
 * For data: and blob: URLs the component renders them directly without any invoke.
 */
export default function ServerImage({ src, alt, className, fallback }: ServerImageProps) {
  const [resolvedSrc, setResolvedSrc] = useState<string | null>(() => {
    if (!src) return null
    if (src.startsWith('data:') || src.startsWith('blob:')) return src
    return dataUrlCache.get(src) ?? null
  })

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

    const cached = dataUrlCache.get(src)
    if (cached) {
      setResolvedSrc(cached)
      return
    }

    let cancelled = false
    invoke<string>('fetch_remote_image', { url: src })
      .then(dataUrl => {
        if (cancelled) return
        dataUrlCache.set(src, dataUrl)
        if (currentSrcRef.current === src) setResolvedSrc(dataUrl)
      })
      .catch(() => {
        // Failed — show fallback; do not cache so a future render can retry
        if (!cancelled && currentSrcRef.current === src) setResolvedSrc(null)
      })

    return () => {
      cancelled = true
    }
  }, [src])

  if (!resolvedSrc) return <>{fallback ?? null}</>
  return <img src={resolvedSrc} alt={alt} className={className} />
}
