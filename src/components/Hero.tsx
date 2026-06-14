import { useEffect, useRef } from 'react'

export default function Hero() {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const v = videoRef.current
    if (!v) return

    const handleError = () => { v.style.display = 'none' }
    const handleStalled = () => {
      if (v.readyState < 2) v.style.display = 'none'
    }

    v.addEventListener('error', handleError, true)
    v.addEventListener('stalled', handleStalled)

    const timer = setTimeout(() => {
      if (v.readyState < 2) {
        const hero = v.closest('.hero') as HTMLElement | null
        if (hero) {
          hero.style.background = `linear-gradient(rgba(58, 53, 48, 0.35), rgba(58, 53, 48, 0.55)),
            url('${v.poster}') center/cover`
        }
      }
    }, 4000)

    return () => {
      v.removeEventListener('error', handleError, true)
      v.removeEventListener('stalled', handleStalled)
      clearTimeout(timer)
    }
  }, [])

  return (
    <header className="hero">
      <div className="hero-bg"></div>
      <video
        className="hero-video"
        ref={videoRef}
        autoPlay
        muted
        loop
        playsInline
        poster="https://img.alicdn.com/imgextra/i4/O1CN01fSe7hK22EMSeTwZiu_!!6000000007088-0-tps-2400-1596.jpg"
      >
        <source src="https://cdn.pixabay.com/video/2023/02/13/150707-797784454_large.mp4" type="video/mp4" />
        <source src="https://cdn.pixabay.com/video/2020/05/25/40130-424888181_large.mp4" type="video/mp4" />
      </video>
      <div className="hero-overlay"></div>
      <div className="hero-content">
        <div className="ornament">· ❦ ·</div>
        <h1>
          Alexandre
          <span className="amp">&amp;</span>
          Léonore
        </h1>
        <div className="date">14 · Septembre · 2026</div>
        <div className="location">
          Paris · France
          <span className="cathedral">Sous la Tour Eiffel</span>
        </div>
      </div>
    </header>
  )
}
