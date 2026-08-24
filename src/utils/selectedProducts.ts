const STORAGE_KEY = 'selected_products'
const API_BASE = import.meta.env.VITE_API_URL || ''

// 延迟导入避免循环依赖，wishlistSync 内部也读 token
const loadWishlist = () => import('./wishlistSync').then(m => m.loadWishlistFromServer())

/** sessionStorage 中的选中项结构 */
export interface SelectedItem {
  categoryId: string
  productId: string
  name: string
  nameEn: string
  price: number
  unit: string
  image?: string
  /** 数量（花卉商品选花数，默认为 1） */
  qty?: number
  /** 规格明细描述，如 "Beaucoup × 2, Énormément × 1" */
  specs?: string
}

/** 生成组合 key：categoryId:productId */
export function makeProductKey(categoryId: string, productId: string): string {
  return `${categoryId}:${productId}`
}

/** 解析组合 key */
export function parseProductKey(key: string): { categoryId: string; productId: string } {
  const [categoryId, productId] = key.split(':')
  return { categoryId, productId }
}

/** 读取所有已选商品 */
export function getSelectedProducts(): SelectedItem[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

/** 写入所有已选商品（全量覆盖） */
function saveSelectedProducts(items: SelectedItem[]): void {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

/**
 * 将当前 sessionStorage 中的购物车同步到后端。
 * 仅在用户已登录时执行，失败时静默忽略。
 */
export function syncCartToServer(): void {
  const token = localStorage.getItem('token')
  if (!token) return
  const items = getSelectedProducts()
  fetch(`${API_BASE}/api/cart/sync`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ items }),
  })
    .then(res => {
      if (!res.ok) console.warn('[cart sync] 同步失败:', res.status)
    })
    .catch(err => console.warn('[cart sync] 同步异常:', err.message))
}

/**
 * 从服务器加载已选商品，与本地 sessionStorage 合并后写回。
 * 设计为登录成功后调用，确保用户之前未登录时选择的商品不丢失。
 */
export async function loadSelectedProductsFromServer(): Promise<void> {
  const token = localStorage.getItem('token')
  if (!token) return

  try {
    const res = await fetch(`${API_BASE}/api/cart`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) {
      console.warn('[cart load] 加载失败:', res.status)
      return
    }
    const json = await res.json()
    if (!json.success || !json.data) {
      console.warn('[cart load] 返回数据异常:', json)
      return
    }

    const serverItems: SelectedItem[] = json.data.map((row: any) => ({
      categoryId: row.category_id,
      productId: row.product_id,
      name: row.name,
      nameEn: row.name_en,
      price: row.price,
      unit: row.unit,
      image: row.image || '',
      qty: row.qty || undefined,
      specs: row.specs || undefined,
    }))

    // 与本地合并：本地数据优先（用户刚修改的更新），服务端仅补充本地没有的
    const localItems = getSelectedProducts()
    const localKeys = new Set(localItems.map(i => makeProductKey(i.categoryId, i.productId)))
    const merged = [...localItems]
    for (const item of serverItems) {
      if (!localKeys.has(makeProductKey(item.categoryId, item.productId))) {
        merged.push(item)
      }
    }

    saveSelectedProducts(merged)
    console.log(`[cart load] 从服务器恢复 ${serverItems.length} 条商品，本地合并后共 ${merged.length} 条`)
  } catch (err) {
    console.warn('[cart load] 网络异常:', (err as Error).message)
  }
}

/**
 * 登录/注册成功后的统一处理函数。
 * 保存 token 和用户信息，然后从服务端恢复购物车和意向单。
 *
 * @param token   - JWT token
 * @param userData - 用户信息，可包含 phone / email
 */
export function onLoginSuccess(token: string, userData: { phone?: string; email?: string }): void {
  localStorage.setItem('token', token)
  if (userData.phone) localStorage.setItem('userPhone', userData.phone)
  if (userData.email) localStorage.setItem('userEmail', userData.email)
  loadSelectedProductsFromServer()
  // 恢复意向单数据（花卉、酒水等）
  loadWishlist().catch(() => {})
}

// ==================== 增删改操作（操作后自动同步后端） ====================

/** 直接存入一个选中项（支持 venue 等非 Product 数据源），返回更新后的完整列表 */
export function setSelectedItem(item: SelectedItem): SelectedItem[] {
  const items = getSelectedProducts()
  const key = makeProductKey(item.categoryId, item.productId)
  if (items.some(i => makeProductKey(i.categoryId, i.productId) === key)) return items
  items.push(item)
  saveSelectedProducts(items)
  syncCartToServer()
  return items
}

/** 更新已选商品的信息（如价格），如不存在则新增 */
export function updateSelectedItem(item: SelectedItem): SelectedItem[] {
  const items = getSelectedProducts()
  const key = makeProductKey(item.categoryId, item.productId)
  const idx = items.findIndex(i => makeProductKey(i.categoryId, i.productId) === key)
  if (idx >= 0) {
    // 仅当数据有变化时才写入
    const existing = items[idx]
    if (existing.price === item.price && existing.unit === item.unit && existing.image === item.image && (existing.qty || 1) === (item.qty || 1) && (existing.specs || '') === (item.specs || '')) return items
    items[idx] = item
  } else {
    items.push(item)
  }
  saveSelectedProducts(items)
  syncCartToServer()
  return items
}

/** 选中一个商品（由调用方传入完整信息），返回更新后的完整列表 */
export function addSelectedProduct(item: SelectedItem): SelectedItem[] {
  return setSelectedItem(item)
}

/** 取消选中一个商品，返回更新后的完整列表 */
export function removeSelectedProduct(categoryId: string, productId: string): SelectedItem[] {
  const items = getSelectedProducts()
  const filtered = items.filter(
    i => !(i.categoryId === categoryId && i.productId === productId)
  )
  saveSelectedProducts(filtered)
  syncCartToServer()
  return filtered
}

/** 判断某个商品是否已选中 */
export function isProductSelected(categoryId: string, productId: string): boolean {
  return getSelectedProducts().some(
    i => i.categoryId === categoryId && i.productId === productId
  )
}

/** 获取某大类下已选中的商品 */
export function getSelectedByCategory(categoryId: string): SelectedItem[] {
  return getSelectedProducts().filter(i => i.categoryId === categoryId)
}

/** 清空所有已选 */
export function clearSelectedProducts(): void {
  sessionStorage.removeItem(STORAGE_KEY)
  syncCartToServer()
}
