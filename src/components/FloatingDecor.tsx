import { useEffect, useRef } from 'react'

export default function FloatingDecor() {
  const layerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const layer = layerRef.current
    if (!layer) return

    const flowers = ['🌹', '🌸', '🌷', '❀', '🌼']
    const driftAnims = ['drift-1', 'drift-2', 'drift-3']
    const ribbonColors = ['', 'gold', 'pink']

    const isMobile = window.matchMedia('(max-width: 768px)').matches
    const initialCount = isMobile ? 4 : 8
    const spawnInterval = isMobile ? 4500 : 2800
    const maxAlive = isMobile ? 10 : 18

    function spawn() {
      if (!layer || layer.childElementCount >= maxAlive) return

      const r = Math.random()
      const item = document.createElement('div')
      item.className = 'float-item'
      item.style.left = (Math.random() * 100) + 'vw'
      const dur = 16 + Math.random() * 14
      const delay = Math.random() * 1.5
      const anim = driftAnims[Math.floor(Math.random() * driftAnims.length)]

      if (r < 0.7) {
        item.textContent = flowers[Math.floor(Math.random() * flowers.length)]
        item.style.fontSize = (14 + Math.random() * 14) + 'px'
        item.style.opacity = (0.35 + Math.random() * 0.3).toFixed(2)
        item.style.filter = `drop-shadow(0 2px 4px rgba(183,110,121,0.25))`
      } else if (r < 0.92) {
        const color = ribbonColors[Math.floor(Math.random() * ribbonColors.length)]
        item.classList.add('ribbon')
        if (color) item.classList.add(color)
        item.style.height = (40 + Math.random() * 50) + 'px'
        item.style.width = (3 + Math.random() * 3) + 'px'
        item.style.opacity = '0.45'
      } else {
        item.classList.add('sparkle')
      }

      item.style.animation = `${anim} ${dur}s linear ${delay}s forwards`
      layer!.appendChild(item)
      setTimeout(() => item.remove(), (dur + delay) * 1000 + 200)
    }

    for (let i = 0; i < initialCount; i++) {
      setTimeout(spawn, i * 600)
    }
    const interval = setInterval(spawn, spawnInterval)

    return () => clearInterval(interval)
  }, [])

  return <div className="floating-decor" ref={layerRef} aria-hidden="true" />
}
