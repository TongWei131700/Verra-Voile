import { Children, cloneElement, isValidElement, useRef, type ReactNode } from 'react'
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
  // 跟踪已 reveal 的子元素 key，防止状态更新时重复注入 reveal-up 导致闪烁
  const revealedKeys = useRef(new Set<string>())

  // 监听 DOM 中 .reveal-up 元素，当它们进入视口时通过 DOM 索引找到对应的 React key
  const containerRef = useRevealChildren<HTMLDivElement>('.reveal-up', 'is-visible', {
    stagger,
    perRow,
    onReveal: (el: HTMLElement) => {
      const parent = containerRef.current
      if (!parent) return
      const domIdx = Array.from(parent.children).indexOf(el)
      const reactChildren = Children.toArray(children)
      const reactChild = reactChildren[domIdx]
      if (reactChild && isValidElement(reactChild) && reactChild.key != null) {
        revealedKeys.current.add(String(reactChild.key))
      }
    },
  })

  const enhancedChildren = Children.map(children, (child, index) => {
    if (isValidElement(child)) {
      const key = child.key != null ? String(child.key) : String(index)
      // 已 reveal 的子元素不再注入 reveal-up，避免状态更新时动画重放
      if (revealedKeys.current.has(key)) {
        return child
      }
      const existing = (child.props as Record<string, unknown>).className as string | undefined
      return cloneElement(child as React.ReactElement<{ className?: string }>, {
        className: `${existing ? existing + ' ' : ''}reveal-up`,
      })
    }
    return child
  })

  return (
    <div ref={containerRef} className={className}>
      {enhancedChildren}
    </div>
  )
}
