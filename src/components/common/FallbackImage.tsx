import { type ImgHTMLAttributes } from 'react'

interface FallbackImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  src: string
  alt?: string
}

// 纯图片渲染组件，不做任何兜底替换
export default function FallbackImage({ src, alt = '', className = '', ...rest }: FallbackImageProps) {
  return (
    <div className={`fallback-img-wrapper ${className}`}>
      <img
        src={src}
        alt={alt}
        referrerPolicy="no-referrer"
        className="fallback-img fallback-img--loaded"
        {...rest}
      />
    </div>
  )
}
