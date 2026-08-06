// 花卉商品数据 —— 来源：greenfieldstudio.co.uk 调研/爬取（测试数据）
const CDN = 'https://images.squarespace-cdn.com/content/v1/677c4cad8635c35334d5863d'

export type FloralCategory = 'all' | 'bridal' | 'brand' | 'installation' | 'realwedding' | 'florajet'

export interface FloralProduct {
  slug: string
  name: string
  nameEn: string
  category: Exclude<FloralCategory, 'all'>
  categoryCn: string
  tagline: string
  desc: string
  highlights: string[]
  cover: string
  images: string[]
  price?: number
  source?: { name: string; url: string }
}

export const floralCategoryList: { key: FloralCategory; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'bridal', label: '婚礼花艺' },
  { key: 'florajet', label: 'Florajet 花束' },
  { key: 'brand', label: '品牌活动' },
  { key: 'installation', label: '花艺装置' },
  { key: 'realwedding', label: '真实婚礼' },
]

export const floralProducts: FloralProduct[] = [
  // ===== 婚礼花艺 =====
  {
    slug: 'gf-bouquet-wild',
    name: '当季野趣新娘手捧花',
    nameEn: 'Seasonal Wild Bridal Bouquet',
    category: 'bridal',
    categoryCn: '婚礼花艺',
    tagline: 'Wild · Natural · Organic',
    desc: '以当季英国本地花材打造的新娘手捧花，野趣自然、充满有机生长的线条感。每一束都根据婚礼当天的季节与色彩定制，让新娘手中的花仿佛刚从乡野树篱间采撷而来。',
    highlights: ['当季花材', '野趣自然风', '全案定制'],
    cover: `${CDN}/62458890-9284-406a-9f06-14e3c3646027/IMG_2891.jpg`,
    images: [
      `${CDN}/62458890-9284-406a-9f06-14e3c3646027/IMG_2891.jpg`,
      `${CDN}/9ee2c9a7-7d22-4077-8237-56772d7dac8f/IMG_2884.JPG`,
    ],
  },
  {
    slug: 'gf-bouquet-spring',
    name: '春日新娘手捧花',
    nameEn: 'Spring Bridal Bouquet',
    category: 'bridal',
    categoryCn: '婚礼花艺',
    tagline: 'Spring Seasonal Blooms',
    desc: '春日限定的新娘手捧花，选用春季最鲜嫩的应季花材，色彩轻盈柔和，与白色婚纱和春日婚礼氛围相得益彰。',
    highlights: ['春季限定', '轻盈配色', '手工扎制'],
    cover: `${CDN}/c41222aa-1c58-4a12-aee7-ba75519e44ca/unnamed-1.jpg`,
    images: [`${CDN}/c41222aa-1c58-4a12-aee7-ba75519e44ca/unnamed-1.jpg`],
  },
  {
    slug: 'gf-buttonholes',
    name: '婚礼胸花',
    nameEn: 'Wedding Buttonholes',
    category: 'bridal',
    categoryCn: '婚礼花艺',
    tagline: 'For Groom & Wedding Party',
    desc: '为新郎与婚礼随行人员设计的精致胸花，与新娘手捧花同色系搭配，细节处呼应整场婚礼的花艺主题。',
    highlights: ['同色系搭配', '多枚起订', '当日新鲜制作'],
    cover: `${CDN}/8ecdb37a-c9f4-4dfa-9310-651baef067fa/Wedding+Buttonholes.jpg`,
    images: [`${CDN}/8ecdb37a-c9f4-4dfa-9310-651baef067fa/Wedding+Buttonholes.jpg`],
  },
  {
    slug: 'gf-vase-arrangement',
    name: '花瓶桌花',
    nameEn: 'Vase Arrangement',
    category: 'bridal',
    categoryCn: '婚礼花艺',
    tagline: 'Wedding Table Florals',
    desc: '婚礼餐桌花瓶插花，野趣自然的造型为宴席增添生动气息。花瓶可回收复用，符合可持续婚礼理念，是长条桌与圆桌皆宜的经典选择。',
    highlights: ['可持续设计', '瓶器可复用', '适配多种桌型'],
    cover: `${CDN}/77b186d1-2f74-4bd6-9321-28d8c216814f/IMG_1833.jpg`,
    images: [
      `${CDN}/77b186d1-2f74-4bd6-9321-28d8c216814f/IMG_1833.jpg`,
      `${CDN}/4736de77-6531-483f-bae9-6ef9a098bfb0/Wild+Seasonal+Vase+Arrangement.jpg`,
    ],
  },
  {
    slug: 'gf-sunflower-centrepiece',
    name: '向日葵餐桌中央瓶花',
    nameEn: 'Sunflower Centrepiece',
    category: 'bridal',
    categoryCn: '婚礼花艺',
    tagline: 'Seasonal Sunflower Concept',
    desc: '以向日葵为主角的婚礼餐桌中央花艺，明亮饱满的色彩为夏末婚礼注入阳光般的暖意，是户外与农场婚礼的绝佳选择。',
    highlights: ['夏末首选', '色彩明亮', '餐桌焦点'],
    cover: `${CDN}/c8677a7a-0394-4544-8b38-20dcd00ae001/IMG_1850.jpg`,
    images: [`${CDN}/c8677a7a-0394-4544-8b38-20dcd00ae001/IMG_1850.jpg`],
  },
  {
    slug: 'gf-bud-vases',
    name: '小花瓶桌花组合',
    nameEn: 'Bud Vases',
    category: 'bridal',
    categoryCn: '婚礼花艺',
    tagline: 'Delicate Table Decoration',
    desc: '精致的小花瓶单支/少量花材组合，错落摆放在餐桌上，营造轻盈不遮挡视线的装饰效果，适合小型精致婚礼与 intimate 晚宴。',
    highlights: ['小巧精致', '不挡视线', '灵活组合'],
    cover: `${CDN}/5b675ec9-3c7b-4daa-b0b1-18bd8aecd429/IMG_2902.jpg`,
    images: [`${CDN}/5b675ec9-3c7b-4daa-b0b1-18bd8aecd429/IMG_2902.jpg`],
  },
  {
    slug: 'gf-bowl-arrangement',
    name: '碗装桌花',
    nameEn: 'Bowl Arrangement',
    category: 'bridal',
    categoryCn: '婚礼花艺',
    tagline: 'Low & Lush Table Florals',
    desc: '低矮饱满的碗装桌花，贴近桌面的设计方便宾客隔桌交谈，丰盈的花量依然保证视觉存在感，是圆桌婚礼的经典之选。',
    highlights: ['低矮设计', '方便交谈', '花量饱满'],
    cover: `${CDN}/82a8ac30-df58-4b55-a862-598e3da44185/IMG_2887.JPG`,
    images: [`${CDN}/82a8ac30-df58-4b55-a862-598e3da44185/IMG_2887.JPG`],
  },
  {
    slug: 'gf-foliage-chandelier',
    name: '绿叶吊灯装置',
    nameEn: 'Foliage Chandelier',
    category: 'installation',
    categoryCn: '花艺装置',
    tagline: 'Marquee Wedding Statement',
    desc: '悬挂于帐篷婚礼上方的绿叶吊灯装置，以茂密的枝叶编织成空中花园，为仪式与晚宴空间带来震撼的立体绿意。',
    highlights: ['空中装置', '帐篷婚礼首选', '沉浸式绿意'],
    cover: `${CDN}/02e516aa-dcc8-40e2-9a22-c39dff451d93/C2E1CC42-8707-458A-B30A-EE0CAE5726D4.JPG`,
    images: [`${CDN}/02e516aa-dcc8-40e2-9a22-c39dff451d93/C2E1CC42-8707-458A-B30A-EE0CAE5726D4.JPG`],
  },
  // ===== 品牌活动 =====
  {
    slug: 'gf-brand-event-florals',
    name: '品牌活动花艺定制',
    nameEn: 'Branded Event Florals',
    category: 'brand',
    categoryCn: '品牌活动',
    tagline: 'Bespoke Brand Event Flowers',
    desc: '为品牌活动提供从概念到落地的全套花艺定制：餐桌花艺、空间布置与品牌色系搭配，曾服务 Essie 夏日派对、橄榄球品牌活动等多个项目。',
    highlights: ['品牌色定制', '全套落地', '多品牌服务经验'],
    cover: `${CDN}/c0511575-0cc8-4e5f-b719-885764e1daf8/Lululemon+Brand+Event+Flowers.jpg`,
    images: [
      `${CDN}/c0511575-0cc8-4e5f-b719-885764e1daf8/Lululemon+Brand+Event+Flowers.jpg`,
      `${CDN}/6d90e1ed-db9f-466b-aa00-d5322fded471/Branded+Event+Flowers.jpg`,
      `${CDN}/6473594b-d841-4001-88ab-8f63210ddc78/Branded+Event+Flowers+Table+Scape.jpg`,
    ],
  },
  {
    slug: 'gf-chelsea-in-bloom',
    name: 'Chelsea in Bloom 橱窗花艺',
    nameEn: 'Chelsea in Bloom Installation',
    category: 'installation',
    categoryCn: '花艺装置',
    tagline: 'Lululemon Chelsea 2024',
    desc: '为 Lululemon 打造的 Chelsea in Bloom 2024 花艺装置，将自然野趣与品牌精神融合于切尔西街头橱窗，是伦敦年度花艺盛事中的亮眼作品。',
    highlights: ['伦敦年度花事', '橱窗装置', '品牌联名'],
    cover: `${CDN}/2c788107-7bc9-4f2b-ad4c-4107e6fe8682/IMG_0613.jpg`,
    images: [
      `${CDN}/2c788107-7bc9-4f2b-ad4c-4107e6fe8682/IMG_0613.jpg`,
      `${CDN}/8873a3eb-f5ba-47aa-882d-b2b6e0c27e9c/DIP10.jpg`,
      `${CDN}/08a4b5b3-52d8-4725-90b0-b701bffd498b/DIP201_Bloom.jpg`,
    ],
  },
  {
    slug: 'gf-plant-installation',
    name: '品牌植物装置',
    nameEn: 'Plant Installation',
    category: 'installation',
    categoryCn: '花艺装置',
    tagline: 'Sculptural Plant Installations',
    desc: '大型植物艺术装置，以雕塑般的造型语言重塑空间气质，适用于品牌发布、快闪店与商业空间，可完全按场地与主题定制。',
    highlights: ['雕塑感造型', '空间定制', '商业项目经验'],
    cover: `${CDN}/cf79beae-66e3-47f7-a29c-e6df514d4556/lululemon+Brand+Event+Flower+Installation.jpg`,
    images: [
      `${CDN}/cf79beae-66e3-47f7-a29c-e6df514d4556/lululemon+Brand+Event+Flower+Installation.jpg`,
      `${CDN}/b2c1f389-dbf1-46c9-8ade-aa3d1e4e286e/DIP205_Bloom.jpg`,
      `${CDN}/9e05a2e0-c66b-4152-a082-063d8cced461/Lululemon+Plant+Installation.jpg`,
    ],
  },
  {
    slug: 'gf-earth-fest',
    name: 'Earth Fest 节庆装置',
    nameEn: 'Earth Fest Installation',
    category: 'installation',
    categoryCn: '花艺装置',
    tagline: 'Earth Fest 2024 · Coal Drops Yard',
    desc: '为 2024 年伦敦 Coal Drops Yard 地球节打造的自然主题装置，以可持续花艺回应环保议题，展现植物艺术的公共表达力。',
    highlights: ['环保主题', '公共艺术', '伦敦地标项目'],
    cover: `${CDN}/813b699c-9aec-4f8e-a5f6-26740136b481/IMG_9426.JPG`,
    images: [`${CDN}/813b699c-9aec-4f8e-a5f6-26740136b481/IMG_9426.JPG`],
  },
  // ===== 真实婚礼 =====
  {
    slug: 'gf-real-wedding-libby-alex',
    name: '真实婚礼案例 · Libby & Alex',
    nameEn: 'Real Wedding: Libby & Alex',
    category: 'realwedding',
    categoryCn: '真实婚礼',
    tagline: 'Photography by Mia Davies',
    desc: 'Libby 与 Alex 的完整婚礼花艺案例：从新娘手捧花到仪式现场布置全程操刀。新人评价"完全懂我们想要什么，照片里每一处细节和创意都清晰可见"。',
    highlights: ['全案花艺', '真实客片', '客户五星好评'],
    cover: `${CDN}/05dda654-31de-4290-9f5a-d4f7b9ecf500/IMG_9896.jpg`,
    images: [
      `${CDN}/05dda654-31de-4290-9f5a-d4f7b9ecf500/IMG_9896.jpg`,
      `${CDN}/a7dd2f90-1590-4f82-8623-d1a7c021d832/TheWeddingOfLibby%26Alex-543.jpg`,
      `${CDN}/65d418f2-6dc8-4509-9050-021db232f26d/TheWeddingOfLibby%26Alex-659.jpg`,
      `${CDN}/3ec11f3b-5dde-49cf-a078-a4d22680cb87/TheWeddingOfLibby%26Alex-361.jpg`,
    ],
  },
]

// 工作室信息
export const floralStudio = {
  name: 'Greenfield Studio',
  nameCn: '格林菲尔德花艺工作室（测试数据）',
  tagline: 'Floral Designer · London and Beyond',
  taglineCn: '花艺设计师 · 伦敦及更远',
  founder: 'Zoe Greenfield',
  location: 'London, UK',
  email: 'zoe@greenfieldstudio.co.uk',
  instagram: 'greenfieldstudio_ldn',
  instagramUrl: 'https://www.instagram.com/greenfieldstudio_ldn/',
  sourceUrl: 'https://www.greenfieldstudio.co.uk/',
  introCn:
    'Greenfield Studio 是一家位于伦敦的花艺设计工作室，由 Zoe Greenfield 创立。工作室的灵感源自英国乡野的原生树篱与四季流转，以现代雕塑般的手法，呈现自然最本真、最不受拘束的美。可持续是创作的初心：只使用当季花材，尽量选用英国本地种植的花卉，全程不使用花泥与塑料——让自然主导设计。',
}
