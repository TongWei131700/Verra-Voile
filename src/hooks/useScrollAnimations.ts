import { useEffect, useRef } from 'react'

/**
 * 通用 IntersectionObserver hook，元素进入视口时添加指定 class
 */
export function useRevealOnScroll<T extends HTMLElement = HTMLElement>(className = 'is-visible', options: IntersectionObserverInit = {}) {
  const ref = useRef<T>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add(className)
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.15, rootMargin: '0px 0px -80px 0px', ...options }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [className, options])

  return ref
}

/**
 * 批量 reveal observer — 观察容器内所有子元素
 */
export function useRevealChildren<T extends HTMLElement = HTMLElement>(selector: string, className = 'is-visible', options: IntersectionObserverInit = {}) {
  const containerRef = useRef<T>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const elements = container.querySelectorAll(selector)
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add(className)
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.15, rootMargin: '0px 0px -80px 0px', ...options }
    )

    elements.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [selector, className])

  return containerRef
}

/**
 * 数字滚动计数动画 hook
 */
export function useCountUp<T extends HTMLElement = HTMLElement>(targetValue: number, duration = 1600) {
  const ref = useRef<T>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const start = performance.now()
            const animate = (now: number) => {
              const t = Math.min((now - start) / duration, 1)
              const eased = 1 - Math.pow(1 - t, 3)
              el.textContent = String(Math.floor(eased * targetValue))
              if (t < 1) requestAnimationFrame(animate)
              else el.textContent = String(targetValue)
            }
            requestAnimationFrame(animate)
            observer.unobserve(el)
          }
        })
      },
      { threshold: 0.5 }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [targetValue, duration])

  return ref
}

/**
 * 视差滚动效果 hook
 */
export function useParallax() {
  useEffect(() => {
    let ticking = false

    const heroContent = document.querySelector('.hero-content') as HTMLElement | null
    const heroBg = document.querySelector('.hero-bg') as HTMLElement | null
    const venueBg = document.querySelector('.venue-bg') as HTMLElement | null
    const venueSection = document.getElementById('venue')

    function updateParallax() {
      const y = window.scrollY
      if (heroContent && y < window.innerHeight) {
        heroContent.style.transform = `translateY(${y * 0.4}px)`
        heroContent.style.opacity = String(Math.max(0, 1 - y / (window.innerHeight * 0.7)))
      }
      if (heroBg && y < window.innerHeight) {
        heroBg.style.transform = `scale(${1.05 + y / 5000}) translateY(${y * 0.2}px)`
      }
      if (venueBg && venueSection) {
        const rect = venueSection.getBoundingClientRect()
        if (rect.bottom > 0 && rect.top < window.innerHeight) {
          const offset = (window.innerHeight - rect.top) * 0.15
          venueBg.style.transform = `translateY(${-offset}px)`
        }
      }
      ticking = false
    }

    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(updateParallax)
        ticking = true
      }
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])
}

/**
 * 导航栏滚动收缩
 */
export function useNavShrink() {
  useEffect(() => {
    const handleScroll = () => {
      const nav = document.querySelector('nav')
      if (!nav) return
      if (window.scrollY > 80) {
        nav.classList.add('scrolled')
        nav.style.padding = '12px 60px'
        nav.style.boxShadow = '0 2px 20px rgba(0,0,0,0.05)'
      } else {
        nav.classList.remove('scrolled')
        nav.style.padding = '20px 60px'
        nav.style.boxShadow = 'none'
      }
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])
}
