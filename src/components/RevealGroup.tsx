import { Children, cloneElement, isValidElement, type ReactNode } from 'react'
import { useRevealChildren } from '../hooks/useScrollAnimations'

interface RevealGroupProps {
  children: ReactNode
  /** 交错延迟(ms)，每个子元素依次延迟 */
  stagger?: number
  /** 每行数量，与 grid 列数一致 */
  perRow?: number
  /** 容器 className */
  className?: string
}

/**
 * 通用入场动画容器 — 自动为子元素添加交错淡入效果
 *
 * 用法：
 * <RevealGroup stagger={120} perRow={4} className="cities-grid">
 *   {items.map(item => <Card key={item.id} />)}
 * </RevealGroup>
 */
export default function RevealGroup({
  children,
  stagger = 0,
  perRow,
  className = '',
}: RevealGroupProps) {
  const ref = useRevealChildren<HTMLDivElement>('.reveal-up', 'is-visible', { stagger, perRow })

  const enhancedChildren = Children.map(children, (child) => {
    if (isValidElement(child)) {
      const existing = (child.props as Record<string, unknown>).className as string | undefined
      return cloneElement(child as React.ReactElement<{ className?: string }>, {
        className: `${existing ? existing + ' ' : ''}reveal-up`,
      })
    }
    return child
  })

  return (
    <div ref={ref} className={className}>
      {enhancedChildren}
    </div>
  )
}
