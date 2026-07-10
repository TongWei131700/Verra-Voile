import { useState, useEffect } from 'react'
import type { Venue } from '../data/venues'
import VenuePanelDesktop from './VenuePanelDesktop'
import VenuePanelMobile from './VenuePanelMobile'

interface VenuePanelProps {
  venue: Venue | null
  onClose: () => void
  onBook: (venue: Venue) => void
}

export default function VenuePanel({ venue, onClose, onBook }: VenuePanelProps) {
  const [isWide, setIsWide] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth > 1024 : true
  )

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1025px)')
    const handler = (e: MediaQueryListEvent) => setIsWide(e.matches)
    mq.addEventListener('change', handler)
    setIsWide(mq.matches)
    return () => mq.removeEventListener('change', handler)
  }, [])

  if (!venue) return null

  return isWide
    ? <VenuePanelDesktop venue={venue} onClose={onClose} onBook={onBook} />
    : <VenuePanelMobile  venue={venue} onClose={onClose} onBook={onBook} />
}
