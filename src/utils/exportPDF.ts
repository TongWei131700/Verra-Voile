import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'

interface PDFItem {
  name: string
  nameEn: string
  price: number
  unit: string
  image?: string
  categoryId: string
}

interface PDFGroup {
  label: string
  items: PDFItem[]
}

/** 预加载图片 */
function preloadImages(urls: string[]): Promise<void> {
  return new Promise(resolve => {
    let loaded = 0
    const total = urls.filter(Boolean).length
    if (total === 0) return resolve()
    for (const url of urls) {
      if (!url) continue
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = img.onerror = () => { loaded++; if (loaded >= total) resolve() }
      img.src = url
    }
  })
}

/** 构建单个分组 HTML */
function buildGroupHTML(group: PDFGroup, index: number): string {
  let rowsHTML = ''
  for (const item of group.items) {
    const symbol = item.unit === '€' ? '€' : item.unit === '£' ? '£' : '¥'
    const imgSrc = item.image || ''
    const imgCell = imgSrc
      ? `<img src="${imgSrc}" crossorigin="anonymous" style="width:48px;height:48px;object-fit:cover;border-radius:6px;display:block;" />`
      : `<div style="width:48px;height:48px;border-radius:6px;background:#f5f0ea;display:flex;align-items:center;justify-content:center;font-size:18px;color:#ccc;">📷</div>`
    rowsHTML += `
      <tr>
        <td style="padding:10px 12px;border-bottom:1px solid #f0ebe3;">${imgCell}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #f0ebe3;font-size:13px;color:#888;">${item.nameEn || ''}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #f0ebe3;font-size:14px;font-weight:500;">${item.name}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #f0ebe3;font-size:14px;text-align:right;white-space:nowrap;color:#b76e79;font-weight:600;">${symbol}${item.price.toLocaleString()}</td>
      </tr>`
  }
  return `
    <div class="pdf-group" data-group-index="${index}" style="margin-bottom:28px;">
      <div style="display:flex;align-items:center;margin-bottom:12px;">
        <span style="font-size:16px;font-weight:600;color:#333;letter-spacing:1px;">${group.label}</span>
        <span style="margin-left:10px;font-size:12px;color:#aaa;">${group.items.length} 项</span>
        <span style="flex:1;height:1px;background:linear-gradient(to right, #b76e79 0%, transparent 100%);margin-left:16px;"></span>
      </div>
      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr style="background:#faf7f2;">
            <th style="padding:8px 12px;text-align:left;font-size:12px;color:#999;font-weight:400;width:60px;">图片</th>
            <th style="padding:8px 12px;text-align:left;font-size:12px;color:#999;font-weight:400;">英文名</th>
            <th style="padding:8px 12px;text-align:left;font-size:12px;color:#999;font-weight:400;">名称</th>
            <th style="padding:8px 12px;text-align:right;font-size:12px;color:#999;font-weight:400;">价格</th>
          </tr>
        </thead>
        <tbody>${rowsHTML}</tbody>
      </table>
    </div>`
}

/**
 * 将订单内容导出为 PDF，按分组智能分页，避免模块被跨页裁切
 */
export async function exportOrderPDF(groups: PDFGroup[], totalPrice: number): Promise<void> {
  const allImages = groups.flatMap(g => g.items.map(i => i.image || ''))
  await preloadImages(allImages)

  // 创建隐藏排版容器
  const container = document.createElement('div')
  container.className = 'pdf-export-container'
  container.style.cssText = `
    position: fixed; left: -9999px; top: 0;
    width: 800px; background: #fff;
    font-family: 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
    color: #333; padding: 0;
  `

  const today = new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })
  const totalItems = groups.reduce((sum, g) => sum + (g.items.length || 1), 0)

  let groupsHTML = ''
  for (let i = 0; i < groups.length; i++) groupsHTML += buildGroupHTML(groups[i], i)

  container.innerHTML = `
    <div id="pdf-header" style="padding:48px 48px 32px;text-align:center;border-bottom:2px solid #b76e79;">
      <h1 style="margin:0;font-size:28px;font-weight:300;letter-spacing:6px;color:#b76e79;">EUROPE WEDDING</h1>
      <p style="margin:8px 0 0;font-size:13px;color:#999;letter-spacing:2px;">婚礼定制方案</p>
    </div>
    <div id="pdf-info" style="padding:24px 48px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #f0ebe3;">
      <span style="font-size:13px;color:#888;">日期：${today}</span>
      <span style="font-size:13px;color:#888;">共 ${totalItems} 项服务</span>
    </div>
    <div id="pdf-groups-wrapper" style="padding:32px 48px 16px;">
      ${groupsHTML}
    </div>
    <div id="pdf-summary" style="margin:0 48px;padding:24px 0;border-top:2px solid #b76e79;display:flex;justify-content:space-between;align-items:center;">
      <span style="font-size:14px;color:#888;">总计</span>
      <span style="font-size:24px;font-weight:600;color:#b76e79;letter-spacing:1px;">€${totalPrice.toLocaleString()}</span>
    </div>
    <div id="pdf-footer" style="padding:24px 48px 40px;text-align:center;">
      <p style="margin:0;font-size:11px;color:#bbb;letter-spacing:1px;">Europe Wedding — Your Dream Wedding, Perfectly Crafted</p>
    </div>
  `

  document.body.appendChild(container)

  try {
    // 测量各区域高度
    const headerEl = document.getElementById('pdf-header')!
    const infoEl = document.getElementById('pdf-info')!
    const summaryEl = document.getElementById('pdf-summary')!
    const footerEl = document.getElementById('pdf-footer')!
    const groupEls = container.querySelectorAll('.pdf-group')

    const headerH = headerEl.offsetHeight
    const infoH = infoEl.offsetHeight
    const summaryH = summaryEl.offsetHeight
    const footerH = footerEl.offsetHeight

    // 测量每个分组高度（含 margin-bottom 28px）
    const groupHeights: number[] = []
    groupEls.forEach(el => groupHeights.push((el as HTMLElement).offsetHeight + 28))

    // A4 像素高度（容器宽 800px 对应 pdfWidth mm）
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const pdfWidth = pdf.internal.pageSize.getWidth()   // 210mm
    const pdfHeight = pdf.internal.pageSize.getHeight()  // 297mm
    const pxPerMm = 800 / pdfWidth
    const pagePx = pdfHeight * pxPerMm  // ≈1122px

    // 智能分页：贪心算法，保证分组不被拆分
    // 首页固定开销 = header + info；末页固定开销 = summary + footer + 40px 安全边距
    const firstFixed = headerH + infoH
    const lastFixed = summaryH + footerH + 40

    const pages: number[][] = []
    let curPage: number[] = []
    let curHeight = firstFixed  // 当前页已用高度

    for (let i = 0; i < groups.length; i++) {
      const gh = groupHeights[i]
      if (curPage.length > 0) {
        // 假设当前页是最后一页（最保守估算），看能否放下
        const wouldBeLast = curHeight + gh + lastFixed
        if (wouldBeLast > pagePx) {
          // 放不下 → 当前页结束，新开一页（非首页，无 header/info）
          pages.push(curPage)
          curPage = [i]
          curHeight = gh  // 非首页没有 header/info 开销
        } else {
          curPage.push(i)
          curHeight += gh
        }
      } else {
        curPage.push(i)
        curHeight += gh
      }
    }
    if (curPage.length > 0) pages.push(curPage)

    // 逐页渲染
    for (let p = 0; p < pages.length; p++) {
      const pageSet = new Set(pages[p])
      const isFirst = p === 0
      const isLast = p === pages.length - 1

      // 显隐分组
      groupEls.forEach((el, idx) => {
        ;(el as HTMLElement).style.display = pageSet.has(idx) ? '' : 'none'
      })

      // 首页显示 header/info，非首页隐藏
      headerEl.style.display = isFirst ? '' : 'none'
      infoEl.style.display = isFirst ? '' : 'none'

      // 末页显示 summary/footer，非末页隐藏
      summaryEl.style.display = isLast ? '' : 'none'
      footerEl.style.display = isLast ? '' : 'none'

      // 截图
      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      })

      const imgData = canvas.toDataURL('image/jpeg', 0.92)
      const imgH = (canvas.height * pdfWidth) / canvas.width

      if (p > 0) pdf.addPage()
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, imgH)
    }

    // 恢复
    groupEls.forEach(el => { ;(el as HTMLElement).style.display = '' })
    headerEl.style.display = ''
    infoEl.style.display = ''
    summaryEl.style.display = ''
    footerEl.style.display = ''

    pdf.save(`EuropeWedding-订单-${today.replace(/\//g, '-')}.pdf`)
  } finally {
    document.body.removeChild(container)
  }
}
