import { useEffect, useRef } from 'react'
import type { SelectedItem } from '../utils/selectedProducts'

const CATEGORY_LABELS: Record<string, string> = {
  destination: '目的地婚礼',
  team: '婚礼团队',
  floral: '花卉',
  wine: '酒水',
  other: '其他',
}

interface ConfirmSummaryProps {
  items: SelectedItem[]
  show: boolean
  onClose: () => void
  onRemove: (categoryId: string, productId: string) => void
}

export default function ConfirmSummary({ items, show, onClose, onRemove }: ConfirmSummaryProps) {
  const ref = useRef<HTMLDivElement>(null)

  // 点击外部关闭
  useEffect(() => {
    if (!show) return
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [show, onClose])

  if (!show) return null

  // 按 categoryId 分组
  const grouped = new Map<string, SelectedItem[]>()
  for (const item of items) {
    const label = CATEGORY_LABELS[item.categoryId] || item.categoryId
    if (!grouped.has(label)) grouped.set(label, [])
    grouped.get(label)!.push(item)
  }

  return (
    <div className="confirm-summary" ref={ref}>
      <div className="confirm-summary__header">
        <span className="confirm-summary__title">已选清单</span>
        <span className="confirm-summary__count">{items.length} 项</span>
        <button type="button" className="confirm-summary__close" onClick={onClose}>✕</button>
      </div>
      <div className="confirm-summary__list">
        {items.length === 0 ? (
          <div className="confirm-summary__empty">暂无已选项目</div>
        ) : (
          Array.from(grouped.entries()).map(([groupLabel, groupItems]) => (
            <div key={groupLabel} className="confirm-summary__group">
              <div className="confirm-summary__group-title">{groupLabel}</div>
              {groupItems.map(item => (
                <div key={`${item.categoryId}:${item.productId}`} className="confirm-summary__item">
                  <div className="confirm-summary__item-info">
                    <span className="confirm-summary__item-name">{item.name}</span>
                    <span className="confirm-summary__item-price">¥{item.price.toLocaleString()}{item.unit ? `/${item.unit}` : ''}</span>
                  </div>
                  <button
                    type="button"
                    className="confirm-summary__item-remove"
                    onClick={() => onRemove(item.categoryId, item.productId)}
                    title="取消选中"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
