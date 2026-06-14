import { useRevealOnScroll } from '../hooks/useScrollAnimations'

interface SectionTitleProps {
  sub: string
  title: string
  className?: string
}

export default function SectionTitle({ sub, title, className = '' }: SectionTitleProps) {
  const ref = useRevealOnScroll<HTMLDivElement>()

  return (
    <div className={`section-title ${className}`} ref={ref}>
      <div className="sub">{sub}</div>
      <h2>{title}</h2>
      <div className="divider"></div>
    </div>
  )
}
