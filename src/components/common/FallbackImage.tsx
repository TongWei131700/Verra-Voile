import { useState, type ImgHTMLAttributes } from 'react'

interface FallbackImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  src: string
  alt?: string
}

// 纯图片渲染组件，加载前显示 shimmer 骨架
export default function FallbackImage({ src, alt = '', className = '', ...rest }: FallbackImageProps) {
  const [loaded, setLoaded] = useState(false)

  return (
    <div className={`fallback-img-wrapper ${className}`}>
      {!loaded && <div className="fallback-img__shimmer" />}
      <img
        src={src}
        alt={alt}
        referrerPolicy="no-referrer"
        className={`fallback-img${loaded ? ' fallback-img--loaded' : ''}`}
        onLoad={() => setLoaded(true)}
        {...rest}
      />
    </div>
  )
}
