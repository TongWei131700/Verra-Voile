/**
 * SSG 预渲染脚本
 * 策略：先预取所有 API 数据，然后在 Puppeteer 中拦截 API 请求直接返回缓存数据
 * 这样页面渲染无需等待网络请求，速度极快
 *
 * 用法: VITE_API_URL=https://europewedding.cn node scripts/prerender.cjs
 */
const http = require('http')
const fs = require('fs')
const path = require('path')
const puppeteer = require('puppeteer')

const DIST_DIR = path.resolve(__dirname, '..', 'dist')
const API_BASE = process.env.VITE_API_URL || 'https://europewedding.cn'
const SITE_URL = 'https://europewedding.cn'
const PORT = 9876

// ---------- 数据缓存 ----------
// key: API 路径（如 /api/products/crawled-florists）, value: JSON 响应体
const apiCache = {}

async function fetchApi(apiPath) {
  const url = `${API_BASE}/api/products${apiPath}`
  console.log(`  → 获取 ${url}`)
  const res = await fetch(url)
  const json = await res.json()
  if (!json.success) throw new Error(`API 失败: ${url}`)
  return json.data
}

// ---------- 静态服务器 ----------
function startStaticServer() {
  const sirv = require('sirv')
  const serve = sirv(DIST_DIR, { single: true, etag: true })
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      serve(req, res, { next: () => { res.statusCode = 404; res.end('Not found') } })
    })
    server.listen(PORT, () => {
      console.log(`  本地服务器: http://localhost:${PORT}`)
      resolve(server)
    })
  })
}

// ---------- 预取所有数据 ----------
async function prefetchAllData() {
  const routeMap = {} // route → 需要的 API 路径列表

  // 首页不需要 API 拦截（它自己会加载各模块概览）
  routeMap['/'] = []

  // 目的地
  try {
    const venues = await fetchApi('/crawled-venues')
    const items = Array.isArray(venues) ? venues : []
    apiCache['/api/products/crawled-venues'] = { success: true, data: items }
    // 列表页
    routeMap['/destinations'] = ['/api/products/crawled-venues']
    for (const v of items) {
      if (v.slug) {
        const route = `/destinations/${v.slug}`
        routeMap[route] = ['/api/products/crawled-venues']
        // 详情页 API：额外请求详情接口获取完整数据（列表接口缺少 description_cn 等字段）
        const detailKey = `/api/products/crawled-venues/${v.slug}`
        try {
          const detailData = await fetchApi(`/crawled-venues/${v.slug}`)
          apiCache[detailKey] = { success: true, data: detailData }
        } catch {
          apiCache[detailKey] = { success: true, data: v }
        }
      }
    }
    console.log(`  目的地场地: ${items.length}`)
  } catch (e) { console.error('  获取目的地失败:', e.message) }

  // 花卉
  try {
    const florists = await fetchApi('/crawled-florists')
    const items = Array.isArray(florists) ? florists : []
    // 花卉列表页直接用后端分类型接口（数据中无 type 字段，后端有自己的过滤逻辑）
    const [serviceRes, productRes] = await Promise.all([
      fetch(`${API_BASE}/api/products/crawled-florists?type=service`).then(r => r.json()),
      fetch(`${API_BASE}/api/products/crawled-florists?type=product`).then(r => r.json()),
    ])
    apiCache['/api/products/crawled-florists?type=service'] = serviceRes
    apiCache['/api/products/crawled-florists?type=product'] = productRes
    apiCache['/api/products/crawled-florists'] = { success: true, data: [...(serviceRes.data || []), ...(productRes.data || [])] }
    // 列表页
    routeMap['/flowers'] = ['/api/products/crawled-florists?type=service', '/api/products/crawled-florists?type=product']
    for (const f of items) {
      if (!f.slug) continue
      const detailKey = `/api/products/crawled-florists/${f.slug}`
      // 额外请求详情接口获取完整数据（列表接口只有 description_preview）
      try {
        const detailData = await fetchApi(`/crawled-florists/${f.slug}`)
        apiCache[detailKey] = { success: true, data: detailData }
      } catch {
        apiCache[detailKey] = { success: true, data: f }
      }
      if (f.type === 'product') {
        routeMap[`/flowers/product/${f.slug}`] = [detailKey]
      } else {
        routeMap[`/flowers/${f.slug}`] = [detailKey]
      }
    }
    console.log(`  花卉: ${items.length}`)
  } catch (e) { console.error('  获取花卉失败:', e.message) }

  // 礼服
  try {
    const dresses = await fetchApi('/crawled-dresses')
    const items = Array.isArray(dresses) ? dresses : []
    apiCache['/api/products/crawled-dresses'] = { success: true, data: items }
    // 列表页
    routeMap['/dresses'] = ['/api/products/crawled-dresses']
    for (const d of items) {
      if (d.slug) {
        const detailKey = `/api/products/crawled-dresses/${d.slug}`
        // 额外请求详情接口获取完整数据
        try {
          const detailData = await fetchApi(`/crawled-dresses/${d.slug}`)
          apiCache[detailKey] = { success: true, data: detailData }
        } catch {
          apiCache[detailKey] = { success: true, data: d }
        }
        routeMap[`/dresses/${d.slug}`] = [detailKey]
      }
    }
    console.log(`  礼服: ${items.length}`)
  } catch (e) { console.error('  获取礼服失败:', e.message) }

  // 摄影师
  try {
    const photographers = await fetchApi('/crawled-photographers')
    const items = Array.isArray(photographers) ? photographers : []
    apiCache['/api/products/crawled-photographers'] = { success: true, data: items }
    // 列表页
    routeMap['/photography'] = ['/api/products/crawled-photographers']
    for (const p of items) {
      if (p.slug) {
        const detailKey = `/api/products/crawled-photographers/${p.slug}`
        // 额外请求详情接口获取完整数据
        try {
          const detailData = await fetchApi(`/crawled-photographers/${p.slug}`)
          apiCache[detailKey] = { success: true, data: detailData }
        } catch {
          apiCache[detailKey] = { success: true, data: p }
        }
        routeMap[`/photography/${p.slug}`] = [detailKey]
      }
    }
    console.log(`  摄影师: ${items.length}`)
  } catch (e) { console.error('  获取摄影师失败:', e.message) }

  // 婚礼团队
  try {
    const teams = await fetchApi('/crawled-wedding-teams')
    const items = Array.isArray(teams) ? teams : []
    apiCache['/api/products/crawled-wedding-teams'] = { success: true, data: items }
    // 列表页
    routeMap['/wedding-team'] = ['/api/products/crawled-wedding-teams']
    for (const t of items) {
      if (t.slug) {
        const detailKey = `/api/products/crawled-wedding-teams/${t.slug}`
        // 额外请求详情接口获取完整数据
        try {
          const detailData = await fetchApi(`/crawled-wedding-teams/${t.slug}`)
          apiCache[detailKey] = { success: true, data: detailData }
        } catch {
          apiCache[detailKey] = { success: true, data: t }
        }
        routeMap[`/wedding-team/${t.slug}`] = [detailKey]
      }
    }
    console.log(`  婚礼团队: ${items.length}`)
  } catch (e) { console.error('  获取婚礼团队失败:', e.message) }

  // 酒水
  try {
    const wineData = await fetchApi('/wine')
    const products = wineData.products || []
    apiCache['/api/products/wine'] = { success: true, data: wineData }
    // 列表页
    routeMap['/wine'] = ['/api/products/wine']
    for (const w of products) {
      if (w.productId) {
        routeMap[`/wine/${w.productId}`] = ['/api/products/wine']
      }
    }
    console.log(`  酒水: ${products.length}`)
  } catch (e) { console.error('  获取酒水失败:', e.message) }

  console.log(`\n  API 缓存条目: ${Object.keys(apiCache).length}`)
  return routeMap
}

// ---------- 模板管理 ----------
const TEMPLATE_PATH = path.join(DIST_DIR, '_template.html')

function saveTemplate() {
  // 保存 vite build 生成的原始 index.html 作为模板
  fs.copyFileSync(path.join(DIST_DIR, 'index.html'), TEMPLATE_PATH)
  console.log('  模板已保存')
}

function restoreTemplate() {
  // 每次渲染前恢复原始模板，避免上一次渲染的内容干扰
  fs.copyFileSync(TEMPLATE_PATH, path.join(DIST_DIR, 'index.html'))
}

// ---------- 渲染页面 ----------
async function renderPage(browser, route) {
  // 恢复干净的模板再渲染
  restoreTemplate()

  const page = await browser.newPage()

  // 拦截请求：API 请求直接返回缓存数据，图片/字体跳过
  await page.setRequestInterception(true)
  page.on('request', (req) => {
    const url = req.url()
    const type = req.resourceType()

    if (['image', 'font', 'media'].includes(type)) {
      return req.abort()
    }

    // API 请求 → 返回缓存数据
    if (url.includes('/api/products/')) {
      let apiPath
      try { apiPath = new URL(url).pathname + (new URL(url).search || '') } catch { apiPath = url }
      const pathNoQuery = apiPath.split('?')[0]
      const cached = apiCache[apiPath] || apiCache[pathNoQuery]
      if (cached) {
        return req.respond({
          status: 200,
          contentType: 'application/json',
          headers: { 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify(cached),
        })
      }
    }

    req.continue()
  })

  const url = `http://localhost:${PORT}${route}`
  try {
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 20000 })
    // 确保 React Router 获取正确的路径
    await page.evaluate((path) => {
      window.history.pushState({}, '', path)
      // 触发 popstate 事件，让 React Router 重新匹配路由
      window.dispatchEvent(new PopStateEvent('popstate'))
    }, route)
    // 等待 React 渲染完成 + Helmet DOM 更新
    await new Promise(r => setTimeout(r, 3000))
    
    // 验证 title 是否已更新（排除首页）
    if (route !== '/') {
      const currentTitle = await page.evaluate(() => document.title)
      const defaultTitle = '欧洲目的地婚礼 | EuropeWedding 全程策划'
      if (currentTitle === defaultTitle) {
        console.log(`\n  ⚠ ${route} title 未更新，额外等待 2s...`)
        await new Promise(r => setTimeout(r, 2000))
      }
    }
    
    return await page.content()
  } catch (err) {
    console.error(`\n  ✗ 渲染异常 ${route}: ${err.message}`)
    return null
  } finally {
    try { await page.close() } catch {}
  }
}

function saveHtml(route, html) {
  let filePath
  if (route === '/') {
    // 首页先存到临时文件，最后再覆盖到 index.html
    filePath = path.join(DIST_DIR, '_home_rendered.html')
  } else {
    const parts = route.split('/').filter(Boolean)
    const dir = path.join(DIST_DIR, ...parts.slice(0, -1))
    fs.mkdirSync(dir, { recursive: true })
    filePath = path.join(dir, parts[parts.length - 1] + '.html')
  }
  fs.writeFileSync(filePath, html, 'utf-8')
  const size = (fs.statSync(filePath).size / 1024).toFixed(1)
  return { filePath, size }
}

// ---------- Sitemap ----------
function generateSitemap(routes) {
  const urls = routes.map(r => `  <url><loc>${SITE_URL}${r === '/' ? '' : r}</loc></url>`).join('\n')
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`
  fs.writeFileSync(path.join(DIST_DIR, 'sitemap.xml'), xml, 'utf-8')
  console.log(`  sitemap.xml: ${routes.length} 个 URL`)
}

// ---------- 主流程 ----------
async function main() {
  console.log('=== SSG 预渲染 ===')
  console.log(`  API: ${API_BASE}`)
  console.log(`  dist: ${DIST_DIR}\n`)

  if (!fs.existsSync(path.join(DIST_DIR, 'index.html'))) {
    console.error('  ✗ dist/index.html 不存在，请先运行 vite build')
    process.exit(1)
  }

  // 1. 预取所有 API 数据
  console.log('[1/4] 预取 API 数据...')
  const routeMap = await prefetchAllData()
  const routes = Object.keys(routeMap)
  console.log(`\n  共 ${routes.length} 个页面待渲染\n`)

  // 2. 保存模板
  console.log('[2/5] 保存 HTML 模板...')
  saveTemplate()

  // 3. 启动本地服务器
  console.log('[3/5] 启动本地服务器...')
  const server = await startStaticServer()

  // 4. Puppeteer 渲染
  console.log('[4/5] 预渲染页面...')
  let browser
  let successCount = 0
  let failCount = 0
  let contentCount = 0

  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
    })

    for (let i = 0; i < routes.length; i++) {
      const route = routes[i]
      process.stdout.write(`  [${i + 1}/${routes.length}] ${route} `)

      // 每 80 个页面重启浏览器防内存泄漏
      if (i > 0 && i % 80 === 0) {
        process.stdout.write('\n  (重启浏览器...) ')
        try { await browser.close() } catch {}
        browser = await puppeteer.launch({
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
        })
      }

      const html = await renderPage(browser, route)
      if (html) {
        const { size } = saveHtml(route, html)
        const hasContent = parseFloat(size) > 2
        if (hasContent) contentCount++
        console.log(`✓ (${size}KB${hasContent ? '' : ' 空壳'})`)
        successCount++
      } else {
        failCount++
        console.log('✗')
      }
    }
  } catch (err) {
    console.error(`\n  浏览器崩溃: ${err.message}`)
  } finally {
    try { await browser.close() } catch {}
    server.close()
  }

  // 5. 生成 sitemap
  console.log('\n[5/5] 生成 sitemap.xml...')
  generateSitemap(routes)

  // 清理模板文件，恢复首页渲染结果
  try { fs.unlinkSync(TEMPLATE_PATH) } catch {}
  const homeRendered = path.join(DIST_DIR, '_home_rendered.html')
  if (fs.existsSync(homeRendered)) {
    fs.copyFileSync(homeRendered, path.join(DIST_DIR, 'index.html'))
    fs.unlinkSync(homeRendered)
    console.log('  首页已恢复到 dist/index.html')
  }

  console.log(`\n=== 完成 ===`)
  console.log(`  成功: ${successCount}  失败: ${failCount}  总计: ${routes.length}`)
  console.log(`  有实际内容: ${contentCount}`)
}

main().catch((err) => {
  console.error('预渲染失败:', err)
  process.exit(1)
})
