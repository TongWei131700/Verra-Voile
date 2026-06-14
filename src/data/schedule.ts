export interface ScheduleDetail {
  label: string
  value: string
}

export interface ScheduleItem {
  id: number
  badge: string
  time: string
  eyebrow: string
  title: string
  subtitle: string
  desc: string
  details?: ScheduleDetail[]
  menuGrid?: ScheduleDetail[][]
  visualImg: string
  visualLabel: string
}

export const scheduleData: ScheduleItem[] = [
  {
    id: 1,
    badge: 'I',
    time: '14:00',
    eyebrow: '— Acte I · 序章 —',
    title: '贵客莅临',
    subtitle: "L'Arrivée des Invités · 庄园荣耀迎宾",
    desc: '身着燕尾礼服的白手套侍者列队恭候于雕花铁门两侧，路易十五式马车自栗树大道缓缓驶来。庄园管家奉上欢迎香槟，弦乐四重奏在玫瑰拱廊下奏响德彪西月光曲。',
    details: [
      { label: '迎宾酒款', value: 'Krug Grande Cuvée 168ème Édition' },
      { label: '司仪致辞', value: '庄园伯爵代为引领入席' },
      { label: '伴礼乐章', value: '巴黎国立歌剧院首席弦乐四重奏' },
    ],
    visualImg: 'https://img.alicdn.com/imgextra/i4/O1CN01rdvklH22anrtr1QEo_!!6000000007137-0-tps-1200-800.jpg',
    visualLabel: 'Bienvenue',
  },
  {
    id: 2,
    badge: 'II',
    time: '15:30',
    eyebrow: '— Acte II · 圣典 —',
    title: '圣殿证婚',
    subtitle: 'La Cérémonie Sacrée · 千年教堂神圣盟约',
    desc: '于建于十二世纪的圣母升天大教堂内，Père Joseph Marchand 神父亲临主持。三十六人男孩唱诗班自唱诗台缓步而出，巴洛克管风琴回荡于哥特穹顶之下。新郎自圣坛右侧步入，新娘由父亲挽臂走过五十米罗马柱长廊，沿途三千支烛火跃动如星。',
    details: [
      { label: '主礼神父', value: 'Père Joseph Marchand · 教廷资深主教' },
      { label: '圣咏歌咏', value: '巴黎圣母院青年唱诗班 36 人' },
      { label: '管风琴师', value: 'Maître Olivier Latry · 演奏巴赫《D 大调婚礼颂》' },
      { label: '戒指见证', value: '梵蒂冈祝圣之 Harry Winston 钻戒' },
      { label: '誓言文本', value: '拉丁文古典婚约 · 双语对照' },
    ],
    visualImg: 'https://img.alicdn.com/imgextra/i3/O1CN01bKIDlN1WcZhC9Ve2K_!!6000000002809-0-tps-1200-800.jpg',
    visualLabel: 'Sacré',
  },
  {
    id: 3,
    badge: 'III',
    time: '17:00',
    eyebrow: '— Acte III · 祝福 —',
    title: '花雨长廊',
    subtitle: 'La Pluie de Pétales · 普罗旺斯村民列队祝福',
    desc: '自教堂南门至庄园主厅，全长八百米的青石小径上，凡尔赛附近三个村庄的居民身着传统民族盛装夹道恭候。村中长老吟诵祖传祝词，少女撒下三十万片大马士革玫瑰花瓣与薰衣草，孩童手捧白鸽振翅放飞，老者敲响铜铃为新人祈福。',
    details: [
      { label: '祝福村庄', value: 'Marly · Bailly · Noisy-le-Roi 三村联合' },
      { label: '鲜花总量', value: '30 万片玫瑰花瓣 · 5000 枝薰衣草' },
      { label: '放飞白鸽', value: '108 只 · 寓意百年好合' },
      { label: '民俗祝词', value: '法兰西吟游诗人 Jean-Luc 即兴献唱' },
      { label: '纪念礼物', value: '每位宾客获赠手工蜂蜜与橄榄油' },
    ],
    visualImg: 'https://img.alicdn.com/imgextra/i1/O1CN01HnYbod1rvuLTm7smB_!!6000000005694-0-tps-1200-800.jpg',
    visualLabel: 'Bénédiction',
  },
  {
    id: 4,
    badge: 'IV',
    time: '19:00',
    eyebrow: '— Acte IV · 盛宴 —',
    title: '凡尔赛盛宴',
    subtitle: 'Le Grand Dîner Royal · 九道式法式国宴',
    desc: '于镜厅之内开启豪华晚宴。三位米其林三星主厨 Alain Ducasse、Anne-Sophie Pic、Yannick Alléno 联袂掌勺，呈献九道菜法兰西经典国宴。十二支水晶吊灯映照下，银餐具与博古哈水晶杯流转烛光。',
    menuGrid: [
      [
        { label: '开胃', value: 'Petrossian 鱼子酱配布利尼' },
        { label: '前菜', value: '布列塔尼蓝龙虾配香槟酱' },
        { label: '汤品', value: '松露黑菌奶油浓汤' },
        { label: '海味', value: '纸包野生海鲈配藏红花' },
        { label: '主菜', value: 'Bresse 黑足鸡配 30 年陈酒酱' },
      ],
      [
        { label: '佐餐', value: 'Romanée-Conti 1990' },
        { label: '奶酪', value: '诺曼底手工奶酪三种' },
        { label: '甜品', value: 'Pierre Hermé 玫瑰马卡龙塔' },
        { label: '餐酒', value: 'Château Lafite 1982' },
        { label: '佐酒', value: 'Dom Pérignon P2 Vintage' },
      ],
    ],
    visualImg: 'https://img.alicdn.com/imgextra/i3/O1CN01Xs0o741yQUUHStfUs_!!6000000006573-0-tps-1200-800.jpg',
    visualLabel: 'Festin Royal',
  },
  {
    id: 5,
    badge: 'V',
    time: '21:30',
    eyebrow: '— Acte V · 华舞 —',
    title: '皇家华尔兹',
    subtitle: 'La Première Valse · 维也纳爱乐现场伴奏',
    desc: '维也纳爱乐乐团六十人编制空降庄园舞厅，由音乐总监 Christian Thielemann 亲自执棒。新人于水晶舞池中央起舞，奏响约翰·施特劳斯《蓝色多瑙河》，宾客随后入场共舞，烛光下三百对舞者同步旋转。',
    details: [
      { label: '乐团编制', value: '维也纳爱乐 60 人弦乐管乐' },
      { label: '指挥大师', value: 'Christian Thielemann' },
      { label: '开场之舞', value: '《蓝色多瑙河》圆舞曲' },
      { label: '舞池规格', value: '意大利雕花水晶 · 600 平方米' },
    ],
    visualImg: 'https://img.alicdn.com/imgextra/i1/O1CN01QSWxHj1UA3o1XLhod_!!6000000002476-0-tps-1200-800.jpg',
    visualLabel: 'Valse Royale',
  },
  {
    id: 6,
    badge: 'VI',
    time: '23:30',
    eyebrow: '— Acte VI · 终章 —',
    title: '星河烟火',
    subtitle: "Le Feu d'Artifice · 凡尔赛夜空盛大绽放",
    desc: '由法国国家庆典烟火团队 Groupe F 操刀，倾力打造长达 22 分钟的"爱之星河"烟火秀。万发烟火与古典交响乐《罗密欧与朱丽叶》同步绽放，最终于夜空中拼出"A & L · Forever"金色字样。庆功香槟塔流泻至黎明。',
    details: [
      { label: '烟火团队', value: 'Groupe F · 戛纳电影节御用' },
      { label: '烟火规模', value: '22 分钟 · 10000 发定制烟花' },
      { label: '配乐演出', value: '柴可夫斯基《罗密欧与朱丽叶》' },
      { label: '香槟塔', value: 'Cristal Roederer 七层水晶塔' },
      { label: '派对延续', value: '至次日清晨日出仪式' },
    ],
    visualImg: 'https://img.alicdn.com/imgextra/i2/O1CN01Xrjn3p1l7dAlsB6rc_!!6000000004772-0-tps-1200-800.jpg',
    visualLabel: 'Étoiles',
  },
]
