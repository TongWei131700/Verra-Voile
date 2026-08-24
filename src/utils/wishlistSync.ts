/**
 * 意向单数据库同步工具
 *
 * 花卉（floral）和酒水（wine）模块的意向单明细在登录状态下同步到后端数据库，
 * 未登录时仅操作 sessionStorage，与购物车（selectedProducts.ts）保持一致的双写模式。
 */

const API_BASE = import.meta.env.VITE_API_URL || ''

/** 意向单条目结构（对应后端 user_wishlist 表） */
export interface WishlistEntry {
  categoryId: string        // 'floral' | 'wine' | ...
  productId: string         // 花店slug / 酒水productId
  itemName: string
  itemNameEn: string
  image: string
  basePrice: number
  totalPrice: number
  unit: string
  /** 选花/选酒明细 { idx: { name, price, qty } }，无明细时为 null */
  optionsJson: Record<string, { name: string; price: number; qty: number }> | null
}

/** 从后端返回的原始行数据 */
interface WishlistRow {
  category_id: string
  product_id: string
  item_name: string
  item_name_en: string
  image: string
  base_price: number
  total_price: number
  unit: string
  options_json: Record<string, { name: string; price: number; qty: number }> | null
}

// ─── 内部工具 ────────────────────────────────────────────────────────────────

function getToken(): string | null {
  return localStorage.getItem('token')
}

function authHeaders(token: string): Record<string, string> {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
}

// ─── 写回 sessionStorage ─────────────────────────────────────────────────────

/**
 * 将从服务端取到的条目写回 sessionStorage（恢复用）。
 * 根据 categoryId 决定存储 key 和字段名。
 */
function entryToSessionStorage(entry: WishlistEntry): void {
  const { categoryId, productId, optionsJson } = entry

  if (categoryId === 'floral') {
    // 花卉商品：key = flower_wishlist_${slug}，明细字段 = formules
    const item = {
      slug: productId,
      name: entry.itemNameEn || entry.itemName,
      nameCn: entry.itemName,
      image: entry.image,
      basePrice: entry.basePrice,
      formules: optionsJson || {},
      totalPrice: entry.totalPrice,
      addedAt: Date.now(),
      updatedAt: Date.now(),
    }
    sessionStorage.setItem(`flower_wishlist_${productId}`, JSON.stringify(item))
  } else if (categoryId === 'wine') {
    // 酒水：key = wine_wishlist_${productId}，明细字段 = options
    const item = {
      productId,
      name: entry.itemName,
      nameEn: entry.itemNameEn,
      image: entry.image,
      basePrice: entry.basePrice,
      unit: entry.unit,
      options: optionsJson || {},
      totalPrice: entry.totalPrice,
      addedAt: Date.now(),
      updatedAt: Date.now(),
    }
    sessionStorage.setItem(`wine_wishlist_${productId}`, JSON.stringify(item))
  }
}

/** 从 sessionStorage 中删除对应条目 */
function removeFromSessionStorage(categoryId: string, productId: string): void {
  if (categoryId === 'floral') {
    sessionStorage.removeItem(`flower_wishlist_${productId}`)
  } else if (categoryId === 'wine') {
    sessionStorage.removeItem(`wine_wishlist_${productId}`)
  }
}

// ─── 对外暴露函数 ─────────────────────────────────────────────────────────────

/**
 * 单条 upsert：写入/更新一条意向单到服务端。
 * 未登录时静默跳过。
 */
export function syncWishlistToServer(entry: WishlistEntry): void {
  const token = getToken()
  if (!token) return

  fetch(`${API_BASE}/api/wishlist`, {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify(entry),
  })
    .then(res => {
      if (!res.ok) console.warn('[wishlist sync] upsert 失败:', res.status)
    })
    .catch(err => console.warn('[wishlist sync] 异常:', err.message))
}

/**
 * 删除服务端单条意向单。
 * 同时清除 sessionStorage。未登录时静默跳过。
 */
export function removeWishlistFromServer(categoryId: string, productId: string): void {
  removeFromSessionStorage(categoryId, productId)

  const token = getToken()
  if (!token) return

  fetch(`${API_BASE}/api/wishlist/${encodeURIComponent(categoryId)}/${encodeURIComponent(productId)}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  })
    .then(res => {
      if (!res.ok) console.warn('[wishlist sync] delete 失败:', res.status)
    })
    .catch(err => console.warn('[wishlist sync] 异常:', err.message))
}

/**
 * 从服务端加载所有意向单，并恢复到 sessionStorage。
 * 登录成功后调用。
 */
export async function loadWishlistFromServer(): Promise<WishlistEntry[]> {
  const token = getToken()
  if (!token) return []

  try {
    const res = await fetch(`${API_BASE}/api/wishlist`, {
      headers: authHeaders(token),
    })
    if (!res.ok) {
      console.warn('[wishlist load] 加载失败:', res.status)
      return []
    }
    const json = await res.json()
    if (!json.success || !json.data) {
      console.warn('[wishlist load] 数据异常:', json)
      return []
    }

    const entries: WishlistEntry[] = (json.data as WishlistRow[]).map(row => ({
      categoryId: row.category_id,
      productId: row.product_id,
      itemName: row.item_name,
      itemNameEn: row.item_name_en,
      image: row.image || '',
      basePrice: row.base_price,
      totalPrice: row.total_price,
      unit: row.unit,
      optionsJson: row.options_json,
    }))

    // 写回 sessionStorage
    entries.forEach(entryToSessionStorage)
    console.log(`[wishlist load] 从服务器恢复 ${entries.length} 条意向单`)
    return entries
  } catch (err) {
    console.warn('[wishlist load] 网络异常:', (err as Error).message)
    return []
  }
}

/**
 * 全量同步某个 category 下的所有意向单（覆盖式）。
 * 用于列表页状态变化后一次性同步。
 */
export function syncAllWishlistToServer(categoryId: string, items: WishlistEntry[]): void {
  const token = getToken()
  if (!token) return

  fetch(`${API_BASE}/api/wishlist/sync`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ categoryId, items }),
  })
    .then(res => {
      if (!res.ok) console.warn('[wishlist sync] 全量同步失败:', res.status)
    })
    .catch(err => console.warn('[wishlist sync] 同步异常:', err.message))
}
