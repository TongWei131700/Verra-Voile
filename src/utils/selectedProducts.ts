/** 生成组合 key：categoryId:productId */
export function makeProductKey(categoryId: string, productId: string): string {
  return `${categoryId}:${productId}`
}

/** 解析组合 key */
export function parseProductKey(key: string): { categoryId: string; productId: string } {
  const [categoryId, productId] = key.split(':')
  return { categoryId, productId }
}

const STORAGE_KEY = 'selected_products'

/** sessionStorage 中的选中项结构 */
export interface SelectedItem {
  categoryId: string
  productId: string
  name: string
  nameEn: string
  price: number
  unit: string
  image?: string
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

/** 直接存入一个选中项（支持 venue 等非 Product 数据源），返回更新后的完整列表 */
export function setSelectedItem(item: SelectedItem): SelectedItem[] {
  const items = getSelectedProducts()
  const key = makeProductKey(item.categoryId, item.productId)
  if (items.some(i => makeProductKey(i.categoryId, i.productId) === key)) return items
  items.push(item)
  saveSelectedProducts(items)
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
}
