import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { getSelectedProducts, removeSelectedProduct, clearSelectedProducts } from '../utils/selectedProducts'
import type { SelectedItem } from '../utils/selectedProducts'
import { moduleProducts } from '../data/products'
import { useState } from 'react'

const CATEGORY_LABELS: Record<string, string> = {
  destination: '目的地婚礼',
  team: '婚礼团队',
  floral: '花卉',
  wine: '酒水与餐饮',
  other: '其他服务',
}

/** 根据 categoryId 找到商品图片 */
function getProductImg(categoryId: string, productId: string): string {
  if (categoryId === 'destination') {
    return 'https://images.unsplash.com/photo-1519741497674-611481863552?w=400&h=300&fit=crop'
  }
  const product = moduleProducts[categoryId]?.products.find(p => p.id === productId)
  return product?.img || 'https://images.unsplash.com/photo-1519741497674-611481863552?w=400&h=300&fit=crop'
}

export default function OrderDetail() {
  const navigate = useNavigate()
  const [items, setItems] = useState<SelectedItem[]>(() => getSelectedProducts())

  const grouped = useMemo(() => {
    const map = new Map<string, SelectedItem[]>()
    for (const item of items) {
      const label = CATEGORY_LABELS[item.categoryId] || item.categoryId
      if (!map.has(label)) map.set(label, [])
      map.get(label)!.push(item)
    }
    return map
  }, [items])

  const totalPrice = useMemo(() => items.reduce((sum, i) => sum + i.price, 0), [items])

  const handleRemove = (categoryId: string, productId: string) => {
    const updated = removeSelectedProduct(categoryId, productId)
    setItems([...updated])
  }

  const handleClear = () => {
    clearSelectedProducts()
    setItems([])
  }

  return (
    <div className="order-detail-page">
      {/* 顶部导航 */}
      <div className="order-detail-nav">
        <button className="order-detail-back" onClick={() => navigate(-1)}>
          ← 返回
        </button>
        <h1 className="order-detail-title">订单详情</h1>
        <div className="order-detail-nav-spacer" />
      </div>

      {/* 订单内容 */}
      <div className="order-detail-content">
        {items.length === 0 ? (
          <div className="order-detail-empty">
            <div className="order-detail-empty-icon">📋</div>
            <p>暂无已选商品</p>
            <button className="order-detail-btn-primary" onClick={() => navigate('/listing')}>
              去选购
            </button>
          </div>
        ) : (
          <>
            {/* 按分类展示 */}
            <div className="order-detail-groups">
              {Array.from(grouped.entries()).map(([groupLabel, groupItems]) => (
                <div key={groupLabel} className="order-detail-group">
                  <div className="order-detail-group-header">
                    <span className="order-detail-group-label">{groupLabel}</span>
                    <span className="order-detail-group-count">{groupItems.length} 项</span>
                  </div>
                  {groupItems.map(item => (
                    <div
                      key={`${item.categoryId}:${item.productId}`}
                      className="order-detail-item"
                    >
                      <div className="order-detail-item-img">
                        <img
                          src={getProductImg(item.categoryId, item.productId)}
                          alt={item.name}
                          loading="lazy"
                        />
                      </div>
                      <div className="order-detail-item-info">
                        <div className="order-detail-item-name">{item.name}</div>
                        <div className="order-detail-item-name-en">{item.nameEn}</div>
                        <div className="order-detail-item-price">
                          {item.unit === '€' ? '€' : '¥'}{item.price.toLocaleString()}
                        </div>
                      </div>
                      <button
                        className="order-detail-item-remove"
                        onClick={() => handleRemove(item.categoryId, item.productId)}
                        title="移除"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            {/* 底部汇总 */}
            <div className="order-detail-summary">
              <div className="order-detail-summary-row">
                <span>共 {items.length} 项服务</span>
                <span className="order-detail-total">
                  合计：€{totalPrice.toLocaleString()}
                </span>
              </div>
              <div className="order-detail-actions">
                <button className="order-detail-btn-clear" onClick={handleClear}>
                  清空选择
                </button>
                <button className="order-detail-btn-primary" onClick={() => navigate('/listing')}>
                  继续选购
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
