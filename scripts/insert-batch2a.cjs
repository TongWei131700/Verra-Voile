const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

const BASE = '/Users/hongli/WorkSpace/Verra-Voile-Uploads/crawled';

function getImages(slug, prefix) {
  const dir = path.join(BASE, slug);
  try {
    return fs.readdirSync(dir)
      .filter(f => f.endsWith('.jpg'))
      .sort()
      .map(f => `/uploads/crawled/${slug}/${f}`);
  } catch { return []; }
}

const venues = [
  {
    slug: 'schloss-elmau', name: 'Schloss Elmau', name_cn: '埃尔毛城堡',
    country: 'Germany', country_cn: '德国', region: 'Bavaria', city: 'Krün', city_cn: '克鲁恩',
    address: 'In Elmau 2, 82493 Elmau, Germany',
    tagline: 'Luxury Spa Retreat in the Bavarian Alps', tagline_cn: '巴伐利亚阿尔卑斯山奢华水疗度假胜地',
    description: 'Schloss Elmau is a 5-star luxury spa retreat nestled in the Elmau Valley at the foot of the Bavarian Alps. The estate features two Leading Hotels of the World properties with 147 rooms, six spas with nine pools, and Michelin-starred dining.',
    description_cn: '埃尔毛城堡是一座五星级豪华水疗度假胜地，坐落于巴伐利亚阿尔卑斯山脚下的埃尔毛山谷。庄园拥有两家世界领先酒店，共147间客房，六个水疗中心和九个泳池，以及米其林星级餐饮。',
    phone: '+49 8823 180', website: 'https://www.schloss-elmau.de',
    price: 25000, capacity: 300, sort_order: 147,
    venue_types: JSON.stringify([{name:'Castle',name_cn:'城堡'},{name:'Hotel',name_cn:'酒店'}]),
    amenities: JSON.stringify([
      {titleCn:'设施服务',title:'Facilities & Services',items:[{labelCn:'水疗中心',label:'Spa & Wellness'},{labelCn:'九个泳池',label:'Nine Swimming Pools'},{labelCn:'健身中心',label:'Fitness Center'},{labelCn:'免费停车',label:'Free Parking'}]},
      {titleCn:'餐饮',title:'Catering',items:[{labelCn:'米其林星级餐厅',label:'Michelin-Starred Restaurant'},{labelCn:'多个餐厅',label:'Multiple Restaurants'},{labelCn:'定制婚礼菜单',label:'Custom Wedding Menus'}]},
      {titleCn:'活动空间',title:'Event Spaces',items:[{labelCn:'宴会厅',label:'Grand Ballroom'},{labelCn:'户外花园',label:'Outdoor Gardens'},{labelCn:'音乐厅',label:'Concert Hall'},{labelCn:'山景露台',label:'Mountain View Terraces'}]},
      {titleCn:'住宿',title:'Accommodation',items:[{labelCn:'147间客房和套房',label:'147 Rooms & Suites'},{labelCn:'蜜月套房',label:'Honeymoon Suite'}]}
    ])
  },
  {
    slug: 'huis-bergh', name: 'Kasteel Huis Bergh', name_cn: '贝赫城堡',
    country: 'Netherlands', country_cn: '荷兰', region: 'Gelderland', city: "'s-Heerenberg", city_cn: '斯赫伦贝赫',
    address: "Hof van Bergh 8, 7041 AC 's-Heerenberg, Netherlands",
    tagline: 'Medieval Castle on a Fortified Island', tagline_cn: '坐落于防御岛屿上的中世纪城堡',
    description: 'Kasteel Huis Bergh is a 13th-century castle on an island with ancient fortifications, one of the largest medieval castles in the Netherlands. It offers a fairy-tale setting with medieval towers, woodland gardens, and rich historical atmosphere.',
    description_cn: '贝赫城堡是一座13世纪城堡，坐落于设有古代防御工事的岛屿上，是荷兰最大最重要的中世纪城堡之一。中世纪塔楼、林地花园和浓厚的历史氛围为婚礼提供了童话般的场景。',
    phone: '+31 314 661281', website: 'https://www.huisbergh.nl',
    price: 8000, capacity: 150, sort_order: 148,
    venue_types: JSON.stringify([{name:'Castle',name_cn:'城堡'},{name:'Historic Monument',name_cn:'历史古迹'}]),
    amenities: JSON.stringify([
      {titleCn:'设施服务',title:'Facilities & Services',items:[{labelCn:'免费停车',label:'Free Parking'},{labelCn:'花园',label:'Gardens'},{labelCn:'无线网络',label:'Wi-Fi'}]},
      {titleCn:'餐饮',title:'Catering',items:[{labelCn:'咖啡厅',label:'Café'},{labelCn:'定制餐饮',label:'Custom Catering'},{labelCn:'宴会服务',label:'Banquet Service'}]},
      {titleCn:'活动空间',title:'Event Spaces',items:[{labelCn:'城堡大厅',label:'Castle Halls'},{labelCn:'中世纪塔楼',label:'Medieval Towers'},{labelCn:'花园仪式区',label:'Garden Ceremony Area'}]},
      {titleCn:'住宿',title:'Accommodation',items:[{labelCn:'城堡塔楼套房',label:'Castle Tower Suites'},{labelCn:'周边酒店推荐',label:'Nearby Hotels'}]}
    ])
  },
  {
    slug: 'dragsholm-slot', name: 'Dragsholm Slot', name_cn: '德拉格斯霍尔姆城堡',
    country: 'Denmark', country_cn: '丹麦', region: 'Zealand', city: 'Hørve', city_cn: '赫勒乌',
    address: 'Dragsholm Allé 1, 4534 Hørve, Denmark',
    tagline: '800-Year-Old Michelin-Starred Castle Hotel', tagline_cn: '八百年历史米其林星级城堡酒店',
    description: 'Dragsholm Slot is a luxury castle hotel with over 800 years of history in the UNESCO Global Geopark Odsherred. The castle holds one Michelin star and is a member of Relais & Châteaux, offering 41 rooms, three restaurants, and a castle church.',
    description_cn: '德拉格斯霍尔姆城堡是一座拥有800多年历史的豪华城堡酒店，位于联合国教科文组织世界地质公园。城堡拥有一颗米其林星，是罗莱夏朵成员，提供41间客房、三家餐厅和一座城堡教堂。',
    phone: '+45 59 65 33 00', website: 'https://www.dragsholmslot.dk',
    price: 18000, capacity: 120, sort_order: 149,
    venue_types: JSON.stringify([{name:'Castle',name_cn:'城堡'},{name:'Hotel',name_cn:'酒店'}]),
    amenities: JSON.stringify([
      {titleCn:'设施服务',title:'Facilities & Services',items:[{labelCn:'米其林星级餐厅',label:'Michelin-Starred Restaurant'},{labelCn:'城堡教堂',label:'Castle Church'},{labelCn:'免费停车',label:'Free Parking'}]},
      {titleCn:'餐饮',title:'Catering',items:[{labelCn:'三家餐厅',label:'Three Restaurants'},{labelCn:'鸡尾酒吧',label:'Cocktail Bar'},{labelCn:'酒窖',label:'Wine Cellar'}]},
      {titleCn:'活动空间',title:'Event Spaces',items:[{labelCn:'城堡宴会厅',label:'Castle Banquet Hall'},{labelCn:'优雅露台',label:'Elegant Terraces'},{labelCn:'葡萄园',label:'Vineyards'}]},
      {titleCn:'住宿',title:'Accommodation',items:[{labelCn:'41间特色客房',label:'41 Distinctive Rooms'},{labelCn:'蜜月套房',label:'Honeymoon Suite'}]}
    ])
  },
  {
    slug: 'ashford-castle', name: 'Ashford Castle', name_cn: '阿什福德城堡',
    country: 'Ireland', country_cn: '爱尔兰', region: 'Connacht', city: 'Cong', city_cn: '孔格',
    address: 'Cong, County Mayo, Ireland, F31 CA48',
    tagline: '800-Year-Old Five-Star Castle on Lough Corrib', tagline_cn: '科里布湖畔八百年历史五星级城堡',
    description: 'Ashford Castle is a Forbes Five-Star hotel on the shores of Lough Corrib for over 800 years. Part of The Red Carnation Hotel Collection, it features 83 rooms, an award-winning spa, and the renowned George V Dining Room.',
    description_cn: '阿什福德城堡是一座福布斯五星级酒店，八百多年来屹立在科里布湖畔。现隶属于红石竹酒店系列，拥有83间客房，屡获殊荣的水疗中心，以及著名的乔治五世餐厅。',
    phone: '+353 94 954 6003', website: 'https://www.ashfordcastle.com',
    price: 20000, capacity: 200, sort_order: 150,
    venue_types: JSON.stringify([{name:'Castle',name_cn:'城堡'},{name:'Hotel',name_cn:'酒店'}]),
    amenities: JSON.stringify([
      {titleCn:'设施服务',title:'Facilities & Services',items:[{labelCn:'获奖水疗中心',label:'Award-Winning Spa'},{labelCn:'泳池与健身房',label:'Pool & Gym'},{labelCn:'礼宾服务',label:'Concierge Service'}]},
      {titleCn:'餐饮',title:'Catering',items:[{labelCn:'乔治五世餐厅',label:'George V Dining Room'},{labelCn:'下午茶',label:'Afternoon Tea'},{labelCn:'定制婚礼菜单',label:'Custom Wedding Menus'}]},
      {titleCn:'活动空间',title:'Event Spaces',items:[{labelCn:'中世纪宴会厅',label:'Medieval Banquet Hall'},{labelCn:'湖畔花园',label:'Lakeside Gardens'},{labelCn:'画室',label:'The Drawing Room'}]},
      {titleCn:'住宿',title:'Accommodation',items:[{labelCn:'83间客房和套房',label:'83 Rooms & Suites'},{labelCn:'蜜月套房',label:'Honeymoon Suite'}]}
    ])
  },
  {
    slug: 'rosersbergs-slott', name: 'Rosersbergs Slott', name_cn: '罗瑟斯贝里城堡',
    country: 'Sweden', country_cn: '瑞典', region: 'Stockholm', city: 'Sigtuna', city_cn: '锡格蒂纳',
    address: 'Slottsvägen 203, 195 95 Rosersberg, Sweden',
    tagline: 'Royal Palace Hotel near Stockholm', tagline_cn: '斯德哥尔摩近郊皇家宫殿酒店',
    description: 'Rosersbergs Slott is one of Sweden\'s best-preserved royal palaces from the 17th century, once home to King Karl XIV Johan. The palace hotel offers 63 rooms, 5,000 sqm of event space, and a stunning park overlooking Lake Mälaren.',
    description_cn: '罗瑟斯贝里城堡是瑞典保存最完好的皇家宫殿之一，建于17世纪，曾是卡尔十四世约翰国王的居所。宫殿酒店提供63间客房、5000平方米的活动空间，以及可俯瞰梅拉伦湖的壮丽公园。',
    phone: '+46 8 12 20 20 00', website: 'https://www.rosersbergsslott.se',
    price: 12000, capacity: 200, sort_order: 151,
    venue_types: JSON.stringify([{name:'Palace',name_cn:'宫殿'},{name:'Hotel',name_cn:'酒店'}]),
    amenities: JSON.stringify([
      {titleCn:'设施服务',title:'Facilities & Services',items:[{labelCn:'会议设施',label:'Conference Facilities'},{labelCn:'免费停车',label:'Free Parking'},{labelCn:'花园',label:'Gardens'}]},
      {titleCn:'餐饮',title:'Catering',items:[{labelCn:'城堡餐厅',label:'Castle Restaurant'},{labelCn:'法式风味',label:'French-Inspired Cuisine'},{labelCn:'定制宴会',label:'Custom Banquets'}]},
      {titleCn:'活动空间',title:'Event Spaces',items:[{labelCn:'皇家大厅',label:'Royal Halls'},{labelCn:'5000平方米活动空间',label:'5,000 sqm Event Space'},{labelCn:'小礼拜堂',label:'Chapel'}]},
      {titleCn:'住宿',title:'Accommodation',items:[{labelCn:'63间客房',label:'63 Guest Rooms'},{labelCn:'湖景客房',label:'Lake View Rooms'}]}
    ])
  },
  {
    slug: 'chateau-de-veves', name: 'Château de Vêves', name_cn: '韦夫城堡',
    country: 'Belgium', country_cn: '比利时', region: 'Wallonia', city: 'Houyet', city_cn: '乌耶',
    address: 'Rue de Furfooz 3, 5561 Celles, Belgium',
    tagline: "Belgium's Favorite Fairytale Medieval Castle", tagline_cn: '比利时最受欢迎的童话中世纪城堡',
    description: 'Château de Vêves is one of Belgium\'s most remarkable medieval castles, voted the favorite heritage of Wallonia. Dating back to the 7th century, it features magnificent towers and beautiful woodwork, offering a fairy-tale wedding setting.',
    description_cn: '韦夫城堡是比利时最杰出的中世纪城堡之一，被评为瓦隆尼亚最受喜爱的遗产。城堡始建于7世纪，拥有壮丽的塔楼和精美的木结构，为婚礼提供了童话般的场景。',
    phone: '+32 82 66 63 95', website: 'https://www.chateau-veves.be',
    price: 10000, capacity: 150, sort_order: 152,
    venue_types: JSON.stringify([{name:'Castle',name_cn:'城堡'},{name:'Historic Monument',name_cn:'历史古迹'}]),
    amenities: JSON.stringify([
      {titleCn:'设施服务',title:'Facilities & Services',items:[{labelCn:'免费停车场',label:'Free Parking'},{labelCn:'花园',label:'Gardens'},{labelCn:'导览服务',label:'Guided Tours'}]},
      {titleCn:'餐饮',title:'Catering',items:[{labelCn:'定制宴会餐饮',label:'Custom Event Catering'},{labelCn:'外部餐饮可带入',label:'External Catering Allowed'}]},
      {titleCn:'活动空间',title:'Event Spaces',items:[{labelCn:'城堡大厅',label:'Castle Halls'},{labelCn:'小礼拜堂',label:'Chapel'},{labelCn:'花园仪式区',label:'Garden Ceremony Area'}]},
      {titleCn:'住宿',title:'Accommodation',items:[{labelCn:'周边酒店推荐',label:'Nearby Hotels'},{labelCn:'新郎新娘准备室',label:'Bridal Preparation Room'}]}
    ])
  },
  {
    slug: 'chateau-heralec', name: 'Château Herálec', name_cn: '赫拉莱茨城堡',
    country: 'Czech Republic', country_cn: '捷克', region: 'Vysočina', city: 'Herálec', city_cn: '赫拉莱茨',
    address: 'Herálec 1, 582 55 Herálec, Czech Republic',
    tagline: 'Five-Star Boutique Castle Hotel and Spa', tagline_cn: '五星级精品城堡酒店与水疗中心',
    description: 'Château Herálec is a 5-star boutique hotel and spa by L\'Occitane, set in a national cultural monument with red towers rising over the Vysočina landscape. The romantic castle features luxurious rooms and an award-winning restaurant Honoria.',
    description_cn: '赫拉莱茨城堡是由欧舒丹打造的五星级精品酒店和水疗中心，坐落于一座国家文化古迹之中。这座浪漫的城堡拥有豪华客房、屡获殊荣的Honoria餐厅以及提供欧舒丹护理的水疗中心。',
    phone: '+420 569 669 111', website: 'https://www.chateauheralec.cz',
    price: 10000, capacity: 120, sort_order: 153,
    venue_types: JSON.stringify([{name:'Castle',name_cn:'城堡'},{name:'Hotel',name_cn:'酒店'}]),
    amenities: JSON.stringify([
      {titleCn:'设施服务',title:'Facilities & Services',items:[{labelCn:'欧舒丹水疗',label:"L'Occitane Spa"},{labelCn:'英式公园',label:'English Park'},{labelCn:'免费停车',label:'Free Parking'}]},
      {titleCn:'餐饮',title:'Catering',items:[{labelCn:'Honoria五星餐厅',label:'Five-Star Honoria Restaurant'},{labelCn:'本地食材',label:'Local Ingredients'},{labelCn:'酒窖',label:'Wine Cellar'}]},
      {titleCn:'活动空间',title:'Event Spaces',items:[{labelCn:'城堡宴会厅',label:'Castle Banquet Hall'},{labelCn:'花园仪式区',label:'Garden Ceremony Area'},{labelCn:'历史沙龙',label:'Historic Salons'}]},
      {titleCn:'住宿',title:'Accommodation',items:[{labelCn:'豪华客房和套房',label:'Luxury Rooms & Suites'},{labelCn:'总统套房',label:'Presidential Suite'},{labelCn:'蜜月套房',label:'Honeymoon Suite'}]}
    ])
  }
];

async function main() {
  const conn = await mysql.createConnection({host:'localhost',user:'root',database:'verra_voile'});
  
  for (const v of venues) {
    const imgs = getImages(v.slug, v.slug.split('-').map(w=>w[0]).join(''));
    if (imgs.length === 0) { console.log(`SKIP ${v.slug}: no images`); continue; }
    
    const cover = imgs[0];
    const gallery = JSON.stringify(imgs);
    
    await conn.execute(
      `INSERT INTO crawled_venues (slug,name,name_cn,country,country_cn,region,city,city_cn,address,tagline,tagline_cn,description,description_cn,cover_image,gallery_images,venue_types,amenities,capacity,phone,website,price,sort_order) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [v.slug,v.name,v.name_cn,v.country,v.country_cn,v.region,v.city,v.city_cn,v.address,v.tagline,v.tagline_cn,v.description,v.description_cn,cover,gallery,v.venue_types,v.amenities,v.capacity,v.phone,v.website,v.price,v.sort_order]
    );
    const [rows] = await conn.execute('SELECT LAST_INSERT_ID() as id');
    console.log(`✅ ${v.slug} (id=${rows[0].id}, ${imgs.length} images)`);
  }
  
  await conn.end();
  console.log('Done!');
}
main().catch(e => { console.error(e); process.exit(1); });
