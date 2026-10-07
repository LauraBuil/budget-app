import { useEffect } from 'react'
import type { RefObject } from 'react'

export function useCommitOnOutsidePress(active: boolean, containerRef: RefObject<HTMLElement | null>, onOutside: () => void) {
  useEffect(() => {
    if (!active) return
    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) onOutside()
    }
    document.addEventListener('pointerdown', handlePointerDown, true)
    return () => document.removeEventListener('pointerdown', handlePointerDown, true)
  }, [active, containerRef, onOutside])
}
