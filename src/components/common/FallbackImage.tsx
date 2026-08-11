import { useState, useRef, useEffect, type ImgHTMLAttributes } from 'react'

interface FallbackImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  src: string
  alt?: string
  onImageLoad?: () => void
}

// 已缓存的 src 集合，避免重复显示 shimmer
const cachedSrcSet = new Set<string>()

// 纯图片渲染组件，加载前显示 shimmer 骨架
export default function FallbackImage({ src, alt = '', className = '', onImageLoad, ...rest }: FallbackImageProps) {
  const [loaded, setLoaded] = useState(() => cachedSrcSet.has(src))
  const imgRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    // 如果 src 变化，重置状态
    if (cachedSrcSet.has(src)) {
      setLoaded(true)
      return
    }
    setLoaded(false)
    const img = imgRef.current
    if (img && img.complete && img.naturalWidth > 0) {
      // 图片已在浏览器缓存中
      cachedSrcSet.add(src)
      setLoaded(true)
    }
  }, [src])

  return (
    <div className={`fallback-img-wrapper ${className}`}>
      {!loaded && <div className="fallback-img__shimmer" />}
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        referrerPolicy="no-referrer"
        className={`fallback-img${loaded ? ' fallback-img--loaded' : ''}`}
        onLoad={() => {
          cachedSrcSet.add(src)
          setLoaded(true)
          onImageLoad?.()
        }}
        {...rest}
      />
    </div>
  )
}
