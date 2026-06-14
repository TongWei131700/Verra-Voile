import { useEffect, useRef } from 'react'
import SectionTitle from './SectionTitle'

const galleryItems = [
  { className: 'g1' },
  { className: 'g2' },
  { className: 'g3' },
  { className: 'g4' },
  { className: 'g5' },
  { className: 'g6' },
]

export default function Gallery() {
  const gridRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = gridRef.current
    if (!container) return

    const items = container.querySelectorAll<HTMLElement>('.reveal-zoom')
    items.forEach((img, i) => {
      img.style.transitionDelay = (i * 120) + 'ms'
    })

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible')
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.15, rootMargin: '0px 0px -80px 0px' }
    )

    items.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  return (
    <section id="gallery" className="gallery">
      <SectionTitle sub="Moments" title="时光画廊" />
      <div className="gallery-grid" ref={gridRef}>
        {galleryItems.map((item) => (
          <div key={item.className} className={`${item.className} reveal-zoom`}></div>
        ))}
      </div>
    </section>
  )
}
