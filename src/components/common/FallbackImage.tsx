import { useState, useEffect, useRef, type ImgHTMLAttributes } from 'react'

const FALLBACK_IMG = 'https://img.alicdn.com/imgextra/i4/O1CN01fSe7hK22EMSeTwZiu_!!6000000007088-0-tps-2400-1596.jpg'
const LOAD_TIMEOUT = 3000 // 3秒超时

interface FallbackImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  src: string
  alt?: string
}

export default function FallbackImage({ src, alt = '', className = '', ...rest }: FallbackImageProps) {
  const [imgSrc, setImgSrc] = useState(src)
  const [loaded, setLoaded] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // src 变化时重置
  useEffect(() => {
    setImgSrc(src)
    setLoaded(false)
  }, [src])

  // 3秒超时：未加载成功则换兜底图
  useEffect(() => {
    if (loaded) return
    timerRef.current = setTimeout(() => {
      setImgSrc(prev => (prev !== FALLBACK_IMG ? FALLBACK_IMG : prev))
    }, LOAD_TIMEOUT)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [loaded, imgSrc])

  const handleError = () => {
    if (imgSrc !== FALLBACK_IMG) {
      setImgSrc(FALLBACK_IMG)
    }
  }

  const handleLoad = () => setLoaded(true)

  return (
    <div className={`fallback-img-wrapper ${className}`}>
      {!loaded && <div className="fallback-img-skeleton" />}
      <img
        src={imgSrc}
        alt={alt}
        referrerPolicy="no-referrer"
        className={`fallback-img ${loaded ? 'fallback-img--loaded' : ''}`}
        onError={handleError}
        onLoad={handleLoad}
        ref={(el) => {
          // 处理缓存图片：如果图片已加载完成但 onLoad 未触发
          if (el && el.complete && el.naturalWidth > 0 && !loaded) {
            setLoaded(true)
          }
        }}
        {...rest}
      />
    </div>
  )
}
