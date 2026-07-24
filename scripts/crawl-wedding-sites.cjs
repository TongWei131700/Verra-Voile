/**
 * StyleMePretty 婚礼网站供应商详情爬虫
 * 
 * 流程：
 * 1. 访问供应商类目列表页，提取所有供应商 profile 链接
 * 2. 逐个访问供应商详情页，提取完整信息
 * 3. 输出结构化 JSON
 * 
 * 输出：scripts/smp-vendors.json
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://www.stylemepretty.com';

// 要爬取的供应商类目（可配置数量）
const VENDOR_CATEGORIES = [
  { name: 'Photographers', url: `${BASE_URL}/vendor-guide/category/all-photographers` },
  { name: 'Venues', url: `${BASE_URL}/vendor-guide/category/all-venues` },
  { name: 'Event Planners', url: `${BASE_URL}/vendor-guide/category/all-event-planners` },
];

// 每个类目最多爬取的供应商数量
const MAX_VENDORS_PER_CATEGORY = 3;

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
  console.log(' 启动 StyleMePretty 供应商详情爬虫...\n');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setUserAgent(
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  );
  await page.setViewport({ width: 1440, height: 900 });

  const allVendors = [];

  for (const category of VENDOR_CATEGORIES) {
    console.log(`\n📋 类目: ${category.name}`);
    console.log(`   URL: ${category.url}`);

    // ===== Step 1: 访问列表页，提取供应商 profile 链接 =====
    console.log('   → 正在加载列表页...');
    try {
      await page.goto(category.url, { waitUntil: 'networkidle2', timeout: 45000 });
      await sleep(3000);
    } catch (err) {
      console.warn(`   ⚠ 列表页加载超时，尝试继续: ${err.message}`);
    }

    // 用 page.evaluate 从 DOM 中提取供应商链接
    const vendorLinks = await page.evaluate(() => {
      const links = [];
      const seen = new Set();

      // 查找所有指向 vendor-profile 的链接
      document.querySelectorAll('a[href*="/vendor-profile/"]').forEach(a => {
        const href = a.getAttribute('href');
        if (href && !seen.has(href)) {
          seen.add(href);
          // 提取供应商名称（从链接文本或 href 中）
          const text = a.textContent.trim();
          const nameFromUrl = href
            .split('/vendor-profile/')[1]
            .split('?')[0]
            .replace(/-/g, ' ')
            .replace(/\b\w/g, c => c.toUpperCase());

          links.push({
            name: text || nameFromUrl,
            url: href.startsWith('http') ? href : `https://www.stylemepretty.com${href}`,
            slug: href.split('/vendor-profile/')[1].split('?')[0],
          });
        }
      });

      return links;
    });

    console.log(`   ✓ 列表页发现 ${vendorLinks.length} 个供应商链接`);

    if (vendorLinks.length === 0) {
      console.log('   ⚠ 未找到供应商链接，尝试滚动页面...');
      // 尝试滚动加载更多
      for (let i = 0; i < 3; i++) {
        await page.evaluate(() => window.scrollBy(0, 800));
        await sleep(1500);
      }
      const retryLinks = await page.evaluate(() => {
        const links = [];
        const seen = new Set();
        document.querySelectorAll('a[href*="/vendor-profile/"]').forEach(a => {
          const href = a.getAttribute('href');
          if (href && !seen.has(href)) {
            seen.add(href);
            const text = a.textContent.trim();
            const nameFromUrl = href.split('/vendor-profile/')[1].split('?')[0].replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
            links.push({ name: text || nameFromUrl, url: href.startsWith('http') ? href : `https://www.stylemepretty.com${href}`, slug: href.split('/vendor-profile/')[1].split('?')[0] });
          }
        });
        return links;
      });
      vendorLinks.push(...retryLinks.filter(l => !vendorLinks.some(v => v.slug === l.slug)));
      console.log(`   ✓ 滚动后发现 ${vendorLinks.length} 个供应商链接`);
    }

    // 限制数量
    const vendorsToCrawl = vendorLinks.slice(0, MAX_VENDORS_PER_CATEGORY);
    console.log(`   → 将爬取前 ${vendorsToCrawl.length} 个供应商详情\n`);

    // ===== Step 2: 逐个访问详情页 =====
    for (let i = 0; i < vendorsToCrawl.length; i++) {
      const vendor = vendorsToCrawl[i];
      console.log(`   [${i + 1}/${vendorsToCrawl.length}] 爬取: ${vendor.name}`);

      try {
        await page.goto(vendor.url, { waitUntil: 'networkidle2', timeout: 30000 });
        await sleep(2500);

        // 用 page.evaluate 提取详情页所有信息
        const detail = await page.evaluate(() => {
          const getText = (selector) => {
            const el = document.querySelector(selector);
            return el ? el.textContent.trim() : '';
          };

          const getTexts = (selector) => {
            return [...document.querySelectorAll(selector)].map(el => el.textContent.trim()).filter(Boolean);
          };

          const getHref = (selector) => {
            const el = document.querySelector(selector);
            return el ? el.getAttribute('href') || '' : '';
          };

          // 名称
          const name = getText('h1, .vendor-profile__name, [class*="vendor-name"]') ||
                       document.title.replace(' | Style Me Pretty', '').trim();

          // 面包屑 / 分类路径
          const breadcrumbs = getTexts('.breadcrumb a, [class*="breadcrumb"] a, nav a').filter(t => t && t !== 'Home');

          // About 简介
          const aboutText = getText('[class*="about"] p, .vendor-about p, [class*="description"] p') ||
                            getText('.vendor-profile__about p') ||
                            getText('[class*="bio"] p');

          // 服务区域
          const location = getText('[class*="location"], [class*="serving"], [class*="market"]') ||
                           getTexts('[class*="location"] a, [class*="market"] a').join(', ');

          // 服务类型
          const services = getTexts('[class*="service"] li, [class*="service"] span, [class*="services"] li');

          // 社交媒体链接
          const socialLinks = {};
          document.querySelectorAll('a[href*="instagram.com"], a[href*="pinterest.com"], a[href*="facebook.com"]').forEach(a => {
            const href = a.getAttribute('href');
            if (href.includes('instagram')) socialLinks.instagram = href;
            if (href.includes('pinterest')) socialLinks.pinterest = href;
            if (href.includes('facebook')) socialLinks.facebook = href;
          });

          // 官网链接
          const website = getHref('a[href*="http"]:not([href*="stylemepretty"]):not([href*="instagram"]):not([href*="pinterest"]):not([href*="facebook"])');

          // 合作供应商
          const collaboratedVendors = [];
          document.querySelectorAll('[class*="vendor"] a[href*="/vendor-profile/"]').forEach(a => {
            const href = a.getAttribute('href');
            const text = a.textContent.trim();
            if (href && text && text.length < 50) {
              collaboratedVendors.push({
                name: text,
                url: href.startsWith('http') ? href : `https://www.stylemepretty.com${href}`,
              });
            }
          });

          // 作品集 Galleries
          const galleries = [];
          document.querySelectorAll('[class*="gallery"] a, [class*="Gallery"] a, article a[href*="/20"]').forEach(a => {
            const href = a.getAttribute('href');
            const title = a.querySelector('h2, h3, h4, [class*="title"]')?.textContent.trim() ||
                          a.getAttribute('title') || '';
            const img = a.querySelector('img')?.getAttribute('src') || a.querySelector('img')?.getAttribute('data-src') || '';
            if (href && (title || img)) {
              galleries.push({ title, url: href.startsWith('http') ? href : `https://www.stylemepretty.com${href}`, image: img });
            }
          });

          // 编辑内容 Editorials
          const editorials = [];
          document.querySelectorAll('[class*="editorial"] a, [class*="Editorial"] a').forEach(a => {
            const href = a.getAttribute('href');
            const title = a.textContent.trim();
            if (href && title && title.length > 5) {
              editorials.push({ title, url: href.startsWith('http') ? href : `https://www.stylemepretty.com${href}` });
            }
          });

          // 图片（供应商头像/封面）
          const profileImage = document.querySelector('[class*="avatar"] img, [class*="profile"] img, [class*="hero"] img, header img')?.getAttribute('src') || '';

          // 其他供应商推荐
          const otherVendors = [];
          document.querySelectorAll('[class*="Other"] a[href*="/vendor-profile/"], [class*="other"] a[href*="/vendor-profile/"]').forEach(a => {
            const href = a.getAttribute('href');
            const text = a.textContent.trim();
            if (href && text && text.length < 50) {
              otherVendors.push({ name: text, url: href.startsWith('http') ? href : `https://www.stylemepretty.com${href}` });
            }
          });

          return {
            name,
            category: breadcrumbs[0] || '',
            subCategory: breadcrumbs[1] || '',
            breadcrumbPath: breadcrumbs,
            location,
            about: aboutText,
            services,
            socialLinks,
            website,
            profileImage,
            collaboratedVendors: [...new Map(collaboratedVendors.map(v => [v.name, v])).values()],
            galleries: galleries.slice(0, 10),
            editorials: editorials.slice(0, 10),
            otherVendors: [...new Map(otherVendors.map(v => [v.name, v])).values()],
          };
        });

        detail.profileUrl = vendor.url;
        detail.slug = vendor.slug;
        detail.crawlStatus = 'success';

        allVendors.push(detail);
        console.log(`      ✓ 名称: ${detail.name}`);
        console.log(`      ✓ 分类: ${detail.category} > ${detail.subCategory}`);
        console.log(`      ✓ 服务区域: ${detail.location || 'N/A'}`);
        console.log(`      ✓ 简介长度: ${detail.about.length} 字符`);
        console.log(`      ✓ 合作供应商: ${detail.collaboratedVendors.length} 个`);
        console.log(`      ✓ 作品集: ${detail.galleries.length} 个`);

      } catch (err) {
        console.warn(`      ✗ 爬取失败: ${err.message}`);
        allVendors.push({
          name: vendor.name,
          profileUrl: vendor.url,
          slug: vendor.slug,
          crawlStatus: 'failed',
          error: err.message,
        });
      }

      await sleep(2000); // 礼貌延迟
    }
  }

  await browser.close();

  // ===== 整理输出 =====
  const result = {
    crawlTime: new Date().toISOString(),
    source: 'stylemepretty.com',
    summary: {
      totalCategories: VENDOR_CATEGORIES.length,
      totalVendors: allVendors.length,
      successCount: allVendors.filter(v => v.crawlStatus === 'success').length,
      failCount: allVendors.filter(v => v.crawlStatus === 'failed').length,
    },
    categories: VENDOR_CATEGORIES.map(c => c.name),
    vendors: allVendors,
  };

  const outputPath = path.join(__dirname, 'smp-vendors.json');
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), 'utf-8');

  console.log('\n✅ 爬取完成！');
  console.log(`\n📊 统计摘要:`);
  console.log(`   类目数:     ${result.summary.totalCategories}`);
  console.log(`   供应商总数: ${result.summary.totalVendors}`);
  console.log(`   成功:       ${result.summary.successCount}`);
  console.log(`   失败:       ${result.summary.failCount}`);
  console.log(`\n💾 数据已保存到: ${outputPath}`);
}

main().catch(err => {
  console.error('❌ 爬虫执行失败:', err);
  process.exit(1);
});
