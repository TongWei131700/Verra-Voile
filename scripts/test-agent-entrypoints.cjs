const puppeteer = require('puppeteer');
const assert = require('node:assert/strict');
const base = process.env.BASE_URL || 'http://127.0.0.1:5175';
(async () => {
 const data = async name => (await (await fetch(base + '/api/products/' + name)).json()).data;
 const [venues, photographers, teams, attractions, dresses, wines, florist] = await Promise.all(['crawled-venues','crawled-photographers','crawled-wedding-teams','crawled-travel-attractions','crawled-dresses','wine','crawled-florists/florajet'].map(data));
 const routes = ['destinations','photography','wedding-team','travel-photo','flowers','dresses','wine'].map(x => '/' + x);
 routes.push('/destinations/' + venues[0].slug, '/photography/' + photographers[0].slug, '/wedding-team/' + teams[0].slug, '/travel-photo/' + attractions[0].slug, '/flowers/florajet', '/dresses/' + dresses[0].slug, '/wine/' + wines.products[0].productId);
 const products = typeof florist?.fresh_flower_products === 'string' ? JSON.parse(florist.fresh_flower_products) : (florist?.fresh_flower_products || []);
 if (products[0]?.slug) routes.push('/flowers/product/' + products[0].slug);
 const b = await puppeteer.launch({headless:true});
 try {
  const p = await b.newPage();
  for (const mobile of [false, true]) {
   await p.setViewport({width: mobile ? 390 : 1440, height:900});
   for (const route of routes) {
   await p.goto(base + route, {waitUntil:'domcontentloaded'});
   await p.waitForSelector('.agent-page-guide');
   assert.equal(await p.$('#wedding-agent-pad'),null,route + ' loaded chat before interaction');
   assert.ok(await p.$('.agent-catalog-launcher'),route + ' missing floating entry');
   await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
   const overlap = await p.evaluate(() => {
    const a = document.querySelector('.agent-catalog-launcher').getBoundingClientRect();
    return [...document.querySelectorAll('.cd-book-bar--visible')].some(el => {
     const b = el.getBoundingClientRect();
     return b.top < innerHeight && a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
    });
   });
   assert.ok(!overlap, route + ' launcher overlaps booking bar');
   console.log((mobile ? 'mobile ' : 'desktop ') + route + ': guides, lazy launcher and booking bar clearance PASS');
   }
  }
 } finally { await b.close(); }
})().catch(e=>{console.error(e);process.exit(1)});
