import { useState, useCallback, useMemo, useEffect } from 'react'
import { useParams, Link, Navigate, useNavigate } from 'react-router-dom'
import { moduleProducts, makeProductKey } from '../data/products'
import type { Product } from '../data/products'
import type { Venue } from '../data/venues'
import {
  getSelectedProducts,
  getSelectedByCategory,
  addSelectedProduct,
  removeSelectedProduct,
} from '../utils/selectedProducts'
import type { SelectedItem } from '../utils/selectedProducts'
import QuoteCard from '../components/QuoteCard'
import VenuePanel from '../components/VenuePanel'
import CustomSelect from '../components/CustomSelect'
import ConfirmSummary from '../components/ConfirmSummary'
import RevealGroup from '../components/RevealGroup'

// Product → Venue 兼容转换，id 使用组合 key
function toVenue(p: Product, categoryId: string): Venue {
  return {
    id: makeProductKey(categoryId, p.id),
    name: p.name,
    nameEn: p.nameEn,
    desc: p.desc,
    img: p.img,
    price: p.price,
    unit: p.unit,
    capacity: p.capacity,
    highlight: p.highlight,
  }
}

// 模块路由映射
const moduleRouteMap: Record<string, string> = {
  team: '婚礼团队',
  floral: '花卉',
  wine: '酒水',
  other: '其他',
}

export default function ListingProducts() {
  const navigate = useNavigate()
  const { moduleId } = useParams<{ moduleId: string }>()
  const mod = moduleId ? moduleProducts[moduleId] : undefined

  const [selectedProduct, setSelectedProduct] = useState<Venue | null>(null)
  const [showSummary, setShowSummary] = useState(false)
  const [checkedProducts, setCheckedProducts] = useState<Set<string>>(new Set())
  // 存储全部已选商品状态
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>(() => getSelectedProducts())

  // 页面显示时刷新 sessionStorage
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        setSelectedItems(getSelectedProducts())
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    setSelectedItems(getSelectedProducts())
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [])

  if (!mod) return <Navigate to="/listing" replace />

  // 当前大类下已选商品 ID 集合
  const bookedProductIds = useMemo(
    () => new Set(selectedItems.filter(i => i.categoryId === moduleId).map(i => i.productId)),
    [selectedItems, moduleId]
  )

  const toggleProduct = useCallback((pid: string) => {
    setCheckedProducts(prev => {
      const next = new Set(prev)
      if (next.has(pid)) next.delete(pid)
      else next.add(pid)
      return next
    })
  }, [])

  const filteredProducts = checkedProducts.size === 0
    ? mod.products
    : mod.products.filter(p => checkedProducts.has(p.id))

  const handleBook = (venue: Venue) => {
    if (!moduleId) return
    const productId = venue.id.split(':')[1]
    const updated = addSelectedProduct(moduleId, productId)
    setSelectedItems(updated)
    setSelectedProduct(null)
  }

  const handleCancel = (venue: Venue) => {
    if (!moduleId) return
    const productId = venue.id.split(':')[1]
    const updated = removeSelectedProduct(moduleId, productId)
    setSelectedItems(updated)
    setSelectedProduct(null)
  }

  const handleConfirm = () => {
    navigate('/listing')
  }

  // 当前模块在 select 中的默认值
  const selectValue = moduleRouteMap[moduleId || ''] || mod.name
  const selectOptions = ['目的地婚礼', '婚礼团队', '花卉', '酒水', '其他']

  return (
    <div className="customize-page">
      <header className="cust-header">
        <Link to="/listing" className="cust-back">← 返回定制</Link>
        <div className="cust-header__title">
          <p className="cust-header__script">{mod.nameEn}</p>
          <h1>{mod.name}</h1>
          <div className="divider"></div>
          <p className="cust-header__sub">选择您需要的服务</p>
        </div>
        <div className="dest-module-select">
          <p className="dest-module-select__label">类别</p>
          <CustomSelect
            options={selectOptions}
            placeholder={selectValue}
            value={selectValue}
            onChange={(val) => {
              const map: Record<string, string> = {
                '目的地婚礼': 'destination',
                '婚礼团队': 'team',
                '花卉': 'floral',
                '酒水': 'wine',
                '其他': 'other',
              }
              const route = map[val]
              if (route) {
                navigate(`/listing/${route}`)
              }
            }}
          />
        </div>
      </header>

      <section className="cust-section">
        <div className="dest-layout">
          {/* 左侧筛选栏 */}
          <aside className="dest-filter">
            <h4 className="dest-filter__title">服务项目</h4>
            <p className="dest-filter__en">Services</p>
            {checkedProducts.size > 0 && (
              <button
                className="dest-filter__clear"
                onClick={() => setCheckedProducts(new Set())}
              >
                清除筛选
              </button>
            )}
            <ul className="dest-filter__list">
              {mod.products.map(product => (
                <li
                  key={product.id}
                  className={`dest-filter__item dest-filter__item--check${checkedProducts.has(product.id) ? ' dest-filter__item--checked' : ''}`}
                  onClick={() => toggleProduct(product.id)}
                >
                  <span className="dest-filter__check-icon">
                    {checkedProducts.has(product.id) ? '☑' : '☐'}
                  </span>
                  <span className="dest-filter__name">{product.name}</span>
                </li>
              ))}
            </ul>
          </aside>

          {/* 右侧内容区 */}
          <div className="dest-content">
            <div className="dest-city-section">
              <div className="dest-city-header">
                <div className="dest-city-header__left">
                  <div>
                    <p className="dest-city-header__country">{mod.nameEn}</p>
                    <h3 className="dest-city-header__name">{mod.name}</h3>
                    <p className="dest-city-header__style">{mod.products.length} 项服务可选</p>
                  </div>
                </div>
                <p className="dest-city-header__desc">为您精选的{mod.name}服务，每一项都经过严格筛选与品质把控</p>
              </div>

              {filteredProducts.length > 0 ? (
                <RevealGroup stagger={120} perRow={4} className="dest-city-venues">
                  {filteredProducts.map(product => (
                    <div key={product.id} onClick={() => setSelectedProduct(toVenue(product, mod.id))}>
                      <QuoteCard venue={toVenue(product, mod.id)} booked={bookedProductIds.has(product.id)} />
                    </div>
                  ))}
                </RevealGroup>
              ) : (
                <div className="dest-city-empty">
                  <span className="dest-city-empty__icon">✦</span>
                  <p>当前筛选条件下无服务</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <VenuePanel
        venue={selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onBook={handleBook}
        booked={selectedProduct ? bookedProductIds.has(selectedProduct.id.split(':')[1]) : false}
        onCancel={handleCancel}
      />

      <ConfirmSummary items={selectedItems} show={showSummary} onClose={() => setShowSummary(false)} onRemove={(catId, prodId) => { const updated = removeSelectedProduct(catId, prodId); setSelectedItems(updated); }} />

      <div className="confirm-bar">
        <span className="confirm-bar__info" onClick={() => setShowSummary(v => !v)}>已选 <span className="confirm-bar__num">{selectedItems.length}</span> 项</span>
        <button type="button" className="confirm-bar__btn" onClick={handleConfirm}>确认选择</button>
      </div>
    </div>
  )
}
