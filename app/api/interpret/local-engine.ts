import type { Palace, Star, ZiweiChart } from '@/lib/ziwei/types';
import { SI_HUA_TABLE, STAR_DESCRIPTIONS } from '@/lib/ziwei/constants';
import { detectPatterns, getMingGongSummary, type Pattern } from '@/lib/ziwei/patterns';
import { STAR_BRIEF_SEO } from '@/lib/seo/knowledge';

export type LocalTopic =
  | 'overview' | 'personality' | 'love' | 'career' | 'wealth' | 'health'
  | 'daxian' | 'year' | 'palace' | 'sihua' | 'general';

const BRANCH_NAMES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

const PALACE_ALIASES: Record<string, string[]> = {
  命宫: ['命宫', '本命', '命主'],
  兄弟: ['兄弟', '兄弟姐妹'],
  夫妻: ['夫妻', '配偶', '恋爱', '感情', '婚姻', '对象'],
  子女: ['子女', '小孩', '孩子'],
  财帛: ['财帛', '财运', '财富', '金钱', '存款'],
  疾厄: ['疾厄', '健康', '身体'],
  迁移: ['迁移', '外出', '旅行', '变动'],
  仆役: ['仆役', '交友', '人际', '朋友', '合作'],
  官禄: ['官禄', '事业', '工作', '职业'],
  田宅: ['田宅', '房产', '住宅', '家庭环境'],
  福德: ['福德', '精神', '内在', '情绪'],
  父母: ['父母', '长辈'],
};

const TOPIC_RULES: Array<{ topic: LocalTopic; re: RegExp }> = [
  { topic: 'health', re: /健康|身体|疾厄|生病|睡眠|情绪压力/ },
  { topic: 'love', re: /感情|恋爱|婚姻|夫妻|伴侣|对象|桃花/ },
  { topic: 'career', re: /事业|工作|职业|官禄|发展|跳槽|适合什么/ },
  { topic: 'wealth', re: /财|钱|收入|存款|投资|理财/ },
  { topic: 'daxian', re: /大限|这十年|未来十年|当前运势/ },
  { topic: 'year', re: /今年|流年|年度|20\d{2}/ },
  { topic: 'personality', re: /性格|人格|个性|脾气|特质/ },
  { topic: 'overview', re: /总览|整体|命格|命运|全盘/ },
];

const PALACE_FOCUS: Record<string, string> = {
  命宫: '自我定位、行事风格与人生主轴',
  兄弟: '平辈关系、合作资源与竞争互动',
  夫妻: '亲密关系、相处模式与情感需求',
  子女: '创造输出、亲密照顾与晚辈缘分',
  财帛: '金钱流动、价值交换与赚钱方式',
  疾厄: '身体节奏、压力承受与消耗部位',
  迁移: '外部机会、环境变动与公众舞台',
  仆役: '人际网络、团队协作与资源交换',
  官禄: '事业形态、社会位置与专业发展',
  田宅: '安定感、资产库与家庭环境',
  福德: '精神状态、欲望处理与内在休息',
  父母: '权威关系、支持系统与规范影响',
};

const CAREER_DIRECTION: Record<string, string> = {
  紫微: '统筹管理、平台型岗位、品牌主导',
  天机: '策略研究、产品规划、技术分析',
  太阳: '公众表达、组织服务、公共事务',
  武曲: '财务管理、经营决策、执行落地',
  天同: '服务协调、用户关怀、舒适型产品',
  廉贞: '制度法务、纪律型管理、复杂协调',
  天府: '资源管理、稳健经营、平台守护',
  太阴: '运营策划、房产文化、细腻服务',
  贪狼: '市场社交、创意娱乐、资源连接',
  巨门: '表达沟通、研究分析、咨询教育',
  天相: '行政协调、流程管理、辅佐决策',
  天梁: '专业监督、风险控制、教育医疗',
  七杀: '目标执行、竞争突破、项目攻坚',
  破军: '变革创新、项目重整、破旧立新',
};

const WEALTH_MODE: Record<string, string> = {
  紫微: '适合以专业地位和平台资源带财',
  天机: '适合以信息差、方案力和研究判断获利',
  太阳: '适合以公开表达、服务组织和影响力带财',
  武曲: '适合直接经营、金融财务、执行型获利',
  天同: '适合稳定现金流、服务型收入和长期复利',
  廉贞: '适合规则清晰的行业，避免灰色地带',
  天府: '擅长积累和管理，适合稳健资产配置',
  太阴: '适合长期规划、固定资产、细水长流型收入',
  贪狼: '适合社交资源变现，但要控制欲望型消费',
  巨门: '适合专业咨询、内容表达和知识服务',
  天相: '适合稳定岗位、合约收入和制度化积累',
  天梁: '适合专业资历变现，少做高风险短线',
  七杀: '能冲能赚，但要给现金流留安全垫',
  破军: '适合转型创造，但需要严格风险控制',
};

const HEALTH_HINT: Record<string, string> = {
  紫微: '注意头部、压力性紧绷与过度承担',
  天机: '注意神经系统、睡眠节律与思虑过多',
  太阳: '注意眼睛、心脑血管、日晒与过劳',
  武曲: '注意呼吸道、骨骼关节与硬扛受伤',
  天同: '注意代谢、水肿、作息过软导致缺乏运动',
  廉贞: '注意炎症、血液循环、情绪性压力',
  天府: '注意脾胃消化、饮食过量与稳定性失衡',
  太阴: '注意睡眠、肾脏泌尿、情绪性消耗',
  贪狼: '注意肝肾负荷、作息诱惑与过度娱乐',
  巨门: '注意口腔咽喉、消化黏膜、语言压力',
  天相: '注意皮肤黏膜、淋巴循环与规律饮食',
  天梁: '注意慢性旧症复查、肠胃与专业筛查',
  七杀: '注意急性发炎、运动损伤与手术风险',
  破军: '注意耗损、泌尿生殖、透支后反弹',
};

const pad = (value: number) => String(value).padStart(2, '0');
const stripPalaceSuffix = (name: string) => name.replace(/宫$/, '');
const majorStars = (palace?: Palace) => palace?.stars.filter(star => star.type === 'major') ?? [];

function starText(star: Star) {
  const parts = [star.name];
  if (star.brightnessRaw) parts.push(star.brightnessRaw);
  if (star.siHua) parts.push(`化${star.siHua}`);
  return parts.join('·');
}

const starSummary = (stars: Star[]) => (
  stars.length ? stars.map(starText).join('、') : '无主星，倾向借对宫气质，处境更容易受环境牵引'
);

function palaceLabel(palace: Palace) {
  return /宫$/.test(palace.name) ? palace.name : `${palace.name}宫`;
}

function findPalace(chart: ZiweiChart, aliases: string[]) {
  return chart.palaces.find(palace =>
    aliases.some(alias => stripPalaceSuffix(palace.name) === stripPalaceSuffix(alias)),
  );
}

function getPalace(chart: ZiweiChart, canonical: string) {
  return findPalace(chart, [canonical, ...PALACE_ALIASES[canonical]]);
}

function findQuestionPalace(chart: ZiweiChart, question: string) {
  const exact = chart.palaces.find(palace =>
    question.includes(palace.name) || question.includes(stripPalaceSuffix(palace.name)),
  );
  if (exact) return exact;

  for (const [canonical, aliases] of Object.entries(PALACE_ALIASES)) {
    if (aliases.some(alias => question.includes(alias))) {
      const palace = findPalace(chart, [canonical, ...aliases]);
      if (palace) return palace;
    }
  }
  return undefined;
}

function sanfangPalaces(chart: ZiweiChart, palace: Palace) {
  const branches = [
    palace.branch,
    (palace.branch + 4) % 12,
    (palace.branch + 8) % 12,
    (palace.branch + 6) % 12,
  ];
  return chart.palaces
    .filter(palace => branches.includes(palace.branch))
    .sort((left, right) => branches.indexOf(left.branch) - branches.indexOf(right.branch));
}

function describePalace(chart: ZiweiChart, palace: Palace) {
  const majors = majorStars(palace);
  const auxiliary = palace.stars.filter(star => star.type !== 'major').slice(0, 6).map(star => star.name);
  const lines = [
    `- ${palaceLabel(palace)}（${BRANCH_NAMES[palace.branch]}）：主星 ${starSummary(majors)}`,
  ];

  if (palace.isEmpty && palace.borrowedStars?.length) {
    lines.push(`- 空宫借星：${palace.borrowedStars.join('、')}，判断时需要对宫气质一并参看`);
  }
  if (majors.length) {
    const details = majors
      .map(star => STAR_BRIEF_SEO[star.name] ?? STAR_DESCRIPTIONS[star.name]?.keywords)
      .filter(Boolean);
    if (details.length) lines.push(`- 星曜气质：${details.join('；')}`);
  }
  if (auxiliary.length) lines.push(`- 关键辅煞：${auxiliary.join('、')}`);
  if (palace.selfSihua?.length) {
    lines.push(`- 宫干自化：${palace.selfSihua.map(item => `${item.starName}化${item.siHua}`).join('、')}`);
  }

  lines.push(
    `- 三方四正：${sanfangPalaces(chart, palace)
      .map(palace => `${stripPalaceSuffix(palace.name)}(${starSummary(majorStars(palace))})`)
      .join('、')}`,
  );
  return lines.join('\n');
}

function currentDaXian(chart: ZiweiChart) {
  return chart.daXians.find(item => chart.currentAge >= item.startAge && chart.currentAge <= item.endAge)
    ?? chart.daXians[chart.currentDaXianIndex];
}

function patternsText(patterns: Pattern[], max = 4) {
  if (!patterns.length) return '- 未触发仓库规则库中的显著格局，盘面以宫位组合与四化为主。';
  return patterns.slice(0, max).map(pattern => `- ${pattern.name}：${pattern.description}`).join('\n');
}

function chartBasics(chart: ZiweiChart) {
  const birth = chart.birthInfo;
  const daXian = currentDaXian(chart);
  return [
    `命主：${birth.name || '未署名'}；公历 ${birth.year}-${pad(birth.month)}-${pad(birth.day)}，时辰序号 ${birth.hour}`,
    `农历：${chart.lunarInfo.lunarYear}-${pad(Math.abs(chart.lunarInfo.lunarMonth))}-${pad(chart.lunarInfo.lunarDay)}${chart.lunarInfo.isLeapMonth ? '（闰）' : ''}`,
    `命宫：${BRANCH_NAMES[chart.mingGongBranch]}；身宫：${BRANCH_NAMES[chart.shenGongBranch]}；${chart.wuxingJuName}`,
    `命宫主星：${starSummary(majorStars(getPalace(chart, '命宫')))}`,
    daXian ? `当前大限：${daXian.startAge}—${daXian.endAge}岁，落在${stripPalaceSuffix(daXian.palaceName)}` : '',
  ].filter(Boolean).join('\n');
}

function yearStemIndex(year: number) {
  return ((year - 4) % 10 + 10) % 10;
}

function topicOf(question: string): LocalTopic {
  if (/请分析.*(化禄|化权|化科|化忌)/.test(question)) return 'sihua';
  if (/(请解读|分析).*宫|.*宫位/.test(question) && /(命|兄弟|夫妻|子女|财帛|疾厄|迁移|仆役|交友|官禄|田宅|福德|父母)/.test(question)) {
    return 'palace';
  }
  return TOPIC_RULES.find(rule => rule.re.test(question))?.topic ?? 'general';
}

function findSiHua(chart: ZiweiChart, question: string) {
  const starNames = ['紫微', '天机', '太阳', '武曲', '天同', '廉贞', '天府', '太阴', '贪狼', '巨门', '天相', '天梁', '七杀', '破军', '文昌', '文曲', '左辅', '右弼'];
  const match = starNames.map(name => ({ name, match: question.match(`${name}化([禄权科忌])`) })).find(item => item.match);
  if (!match) return undefined;

  const siHua = match.match?.[1] as Star['siHua'];
  return {
    starName: match.name,
    siHua,
    palace: chart.palaces.find(palace => palace.stars.some(star => star.name === match.name)),
  };
}

function overviewAnswer(chart: ZiweiChart, question: string) {
  const ming = getPalace(chart, '命宫');
  const summary = getMingGongSummary(chart);
  const daXian = currentDaXian(chart);
  const daXianPalace = daXian ? chart.palaces.find(palace => palace.branch === daXian.palaceBranch) : undefined;

  return `**【盘面基础】**
${chartBasics(chart)}

**【命格定性】**
命宫结构为 ${starSummary(majorStars(ming))}，核心关键词：${summary.keywords.join('、') || '综合型发展'}。${summary.nature ? `主星气质可视为${summary.nature}。` : ''}

**【格局信号】**
${patternsText(detectPatterns(chart))}

**【三方四正】**
${ming ? describePalace(chart, ming) : '- 未找到命宫'}

**【当前阶段】**
${daXian ? `目前大限走${stripPalaceSuffix(daXian.palaceName)}，主题更容易围绕${PALACE_FOCUS[stripPalaceSuffix(daXian.palaceName)] ?? '该宫对应领域'}展开。` : '当前大限信息不足，建议以本命盘结构为主。'}

**【可执行方向】**
1. 把长期目标拆成三个月内可推进的动作，避免命盘信息变成焦虑。
2. 命宫强项要放在可积累的专业或关系场景里。
3. ${daXianPalace ? `本阶段注意${stripPalaceSuffix(daXianPalace.name)}相关课题的边界。` : '本阶段建议先建立稳定节奏。'}

> 解读口径：本地开源规则版，非线上 AI 大模型；内容供参考，不替代专业医疗、法律、投资建议。`;
}

function personalityAnswer(chart: ZiweiChart) {
  const ming = getPalace(chart, '命宫');
  const summary = getMingGongSummary(chart);
  return `**【命宫性格】**
命宫主星：${starSummary(majorStars(ming))}。关键词：${summary.keywords.join('、') || '稳定、适应、综合'}。

**【三方性格综合】**
- 财帛影响价值判断：${starSummary(majorStars(getPalace(chart, '财帛')))}
- 官禄影响目标风格：${starSummary(majorStars(getPalace(chart, '官禄')))}
- 迁移影响外部表现：${starSummary(majorStars(getPalace(chart, '迁移')))}

**【优势】**
适合在需要判断、协调、执行或表达的场景发挥作用；目标清晰时，不容易停留在空想层。

**【注意】**
若命宫或福德宫煞忌交织，容易把责任感变成自我消耗。给情绪设缓冲区，不要用硬撑证明成熟。

**【建议】**
把性格优势放进固定场景：能写就持续输出，能协调就负责组织，能执行就交付结果。`;
}

function loveAnswer(chart: ZiweiChart) {
  const spouse = getPalace(chart, '夫妻');
  const fortune = getPalace(chart, '福德');
  const ming = getPalace(chart, '命宫');
  const daXian = currentDaXian(chart);

  return `**【感情格局】**
夫妻宫主星：${starSummary(majorStars(spouse))}。你需要的不是只有浓烈情绪，而是能稳定接住情绪的关系。

**【夫妻宫分析】**
${spouse ? describePalace(chart, spouse) : '- 未找到夫妻宫'}

**【内在需求】**
福德宫：${starSummary(majorStars(fortune))}。  
命宫：${starSummary(majorStars(ming))}。

**【当前阶段】**
${daXian ? `当前大限在${stripPalaceSuffix(daXian.palaceName)}。若踩入感情相关宫位，亲密关系容易被放大、检验或重新定义。` : '当前大限信息不足。'}

**【实际建议】**
1. 观察对方如何处理冲突，而不是只看甜蜜期表现。
2. 明确底线：不贬低、不比较、不用语言刺伤；冲突后要有修复。
3. 表达用“事件—感受—需要”，比笼统争对错更容易被接住。`;
}

function careerAnswer(chart: ZiweiChart) {
  const career = getPalace(chart, '官禄');
  const wealth = getPalace(chart, '财帛');
  const ming = getPalace(chart, '命宫');
  const stars = majorStars(career);
  const directions = stars.map(star => CAREER_DIRECTION[star.name]).filter(Boolean);
  const patterns = detectPatterns(chart).filter(pattern => pattern.palaces.some(palace => palace.includes('官') || palace.includes('命')));

  return `**【事业格局】**
官禄宫主星：${starSummary(stars)}。  
适合方向：${directions.length ? directions.join('；') : '从命宫与三方主星综合判断，适合复合型岗位'}。

**【官禄宫分析】**
${career ? describePalace(chart, career) : '- 未找到官禄宫'}

**【命官联动】**
命宫：${starSummary(majorStars(ming))}。  
财帛宫：${starSummary(majorStars(wealth))}。

**【格局加持】**
${patternsText(patterns, 3)}

**【实际策略】**
1. 用 90 天做一个可展示成果，比泛泛规划更能改变位置。
2. 若岗位仍有学习空间，先积累成果再谈转换。
3. 优先选择规则清楚、能积累专业资产的领域。`;
}

function wealthAnswer(chart: ZiweiChart) {
  const wealth = getPalace(chart, '财帛');
  const property = getPalace(chart, '田宅');
  const career = getPalace(chart, '官禄');
  const stars = majorStars(wealth);
  const modes = stars.map(star => WEALTH_MODE[star.name]).filter(Boolean);

  return `**【财运格局】**
财帛宫主星：${starSummary(stars)}。  
财运模式：${modes.length ? modes.join('；') : '偏综合型，需要结合官禄和田宅看收入与留存'}。

**【财帛宫分析】**
${wealth ? describePalace(chart, wealth) : '- 未找到财帛宫'}

**【财库与留存】**
田宅宫：${starSummary(majorStars(property))}。  
官禄宫：${starSummary(majorStars(career))}。  
财帛看流动，田宅看能否留住，官禄看收入来源是否可持续。

**【理财建议】**
1. 先建立 3—6 个月安全现金垫，再谈更高风险配置。
2. 若财帛或田宅见空劫煞星，减少高杠杆和情绪化投机。
3. 用“收入来源—固定支出—储蓄比例—风险额度”四栏复盘。`;
}

function healthAnswer(chart: ZiweiChart) {
  const health = getPalace(chart, '疾厄');
  const fortune = getPalace(chart, '福德');
  const stars = majorStars(health);
  const hints = stars.map(star => HEALTH_HINT[star.name]).filter(Boolean);

  return `**【疾厄宫主星】**
${starSummary(stars)}

**【传统类比关注点】**
${hints.length ? hints.map(hint => `- ${hint}`).join('\n') : '- 未有明显主星提示，重点看作息、压力与既有体质。'}

**【福德与压力】**
福德宫：${starSummary(majorStars(fortune))}。

**【预防建议】**
1. 固定睡眠窗口，减少深夜反复思考。
2. 每周安排规律运动，释放压力。
3. 有具体症状优先就医体检；命理类比只是提醒，不能作为诊断。`;
}

function daXianAnswer(chart: ZiweiChart) {
  const daXian = currentDaXian(chart);
  const palace = daXian ? chart.palaces.find(item => item.branch === daXian.palaceBranch) : undefined;
  const focus = palace ? PALACE_FOCUS[stripPalaceSuffix(palace.name)] : '';

  return `**【当前大限】**
${daXian ? `${daXian.startAge}—${daXian.endAge}岁，大限命宫落在${stripPalaceSuffix(daXian.palaceName)}（${BRANCH_NAMES[daXian.palaceBranch]}）。` : '未找到当前大限。'}

**【阶段主题】**
${palace ? `${stripPalaceSuffix(palace.name)}主${focus ?? '该宫对应领域'}。\n${describePalace(chart, palace)}` : ''}

**【大限四化】**
${daXian?.siHua ? `禄：${daXian.siHua.lu}；权：${daXian.siHua.quan}；科：${daXian.siHua.ke}；忌：${daXian.siHua.ji}` : '未提供大限四化。'}

**【行动建议】**
1. 把大限当成阶段任务，不当作宿命判决。
2. 若阶段宫位偏感情，关系质量和边界会被放大检验。
3. 若阶段宫位偏事业，成果和专业位置是更有效抓手。
4. 若阶段宫位偏福德，先恢复休息和情绪稳定。`;
}

function yearAnswer(chart: ZiweiChart, question: string) {
  const now = new Date();
  const askedYear = Number(question.match(/20\d{2}/)?.[0] ?? now.getFullYear());
  const siHua = SI_HUA_TABLE[yearStemIndex(askedYear)] ?? ['禄星', '权星', '科星', '忌星'];
  const palaceOf = (star: string) => chart.palaces.find(palace => palace.stars.some(item => item.name === star));
  const types = ['禄', '权', '科', '忌'] as const;

  const rows = types.map((type, index) => {
    const star = siHua[index];
    const palace = palaceOf(star);
    const focus = palace ? PALACE_FOCUS[stripPalaceSuffix(palace.name)] : '';
    return `- ${askedYear}年${star}化${type}：${palace ? `落${stripPalaceSuffix(palace.name)}，` : ''}${focus ?? '影响该星对应领域'}`;
  }).join('\n');

  return `**【流年框架】**
${askedYear} 年干四化：${siHua[0]}化禄、${siHua[1]}化权、${siHua[2]}化科、${siHua[3]}化忌。

**【四化落点】**
${rows}

**【本命基础】**
${chartBasics(chart)}

**【年度建议】**
1. 化禄处看机会，也检查是否过度乐观。
2. 化权处适合主动推进，避免只争话语权。
3. 化科处适合学习、考试、文件、曝光与声誉修复。
4. 化忌处优先做风险管理和边界控制。`;
}

function palaceAnswer(chart: ZiweiChart, question: string) {
  const palace = findQuestionPalace(chart, question);
  if (!palace) return overviewAnswer(chart, question);
  const focus = PALACE_FOCUS[stripPalaceSuffix(palace.name)];

  return `**【宫位定位】**
${palaceLabel(palace)}主${focus ?? '该宫对应领域'}。

**【宫位结构】**
${describePalace(chart, palace)}

**【解读要点】**
1. 主星定基调：${starSummary(majorStars(palace))}。
2. 辅煞看细节：吉辅补强，煞忌带来摩擦或反复。
3. 三方四正看支援：不要只看单宫。
4. 空宫不等于不好，只表示气质更依赖对宫与环境。

**【实际建议】**
在这个领域里，先列出可改变变量：时间分配、沟通方式、专业能力、边界和资源。`;
}

function siHuaAnswer(chart: ZiweiChart, question: string) {
  const found = findSiHua(chart, question);
  if (!found?.palace) return overviewAnswer(chart, question);

  const palace = found.palace;
  const focus = PALACE_FOCUS[stripPalaceSuffix(palace.name)];
  const meanings: Record<string, string> = {
    禄: '机会、资源、舒适与扩散，需避免过度乐观',
    权: '掌控、推进、竞争与专业力度，需避免强硬',
    科: '名声、学习、文书、协调与修复，需避免表面化',
    忌: '执着、压力、反复与需要收边，需避免内耗',
  };

  return `**【化${found.siHua}基本含义】**
化${found.siHua}代表${meanings[found.siHua ?? '禄']}。

**【落宫影响】**
${found.starName}化${found.siHua}落在${stripPalaceSuffix(palace.name)}，该宫主管${focus ?? '该宫对应领域'}。宫内主星：${starSummary(majorStars(palace))}。

**【三方四正飞化路径】**
${describePalace(chart, palace)}

**【当前运势影响】**
这个飞化会把注意力拉向${focus ?? '相关领域'}。更适合处理具体事项，而不是只用情绪判断。

**【实际建议】**
1. 写出这个宫位里最现实的一件事。
2. 给它一个两周内可执行的小动作。
3. 若化忌，先止损和减压；若化禄，扩大机会但仍设预算与时间边界。`;
}

function generalAnswer(chart: ZiweiChart, question: string) {
  const ming = getPalace(chart, '命宫');
  const patterns = detectPatterns(chart);

  return `**【盘面速览】**
${chartBasics(chart)}

**【结构重点】**
命宫：${starSummary(majorStars(ming))}。  
显著格局：${patterns.slice(0, 3).map(pattern => pattern.name).join('、') || '无特别突出格局'}。

**【对问题的回应】**
${question ? `你问：“${question.trim()}”。` : ''}建议先判断这是长期结构问题，还是短期阶段波动。长期问题要改环境或边界；短期波动先稳定节奏，不要在情绪高点做重大决定。

**【下一步】**
可以更具体地问感情、事业、财运、健康、性格、当前大限或某一年流年。

> 本地开源规则版解读：结构化参考，不替代专业建议。`;
}

export function buildLocalInterpretation(chart: ZiweiChart, question: string) {
  const topic = topicOf(question);
  switch (topic) {
    case 'overview': return overviewAnswer(chart, question);
    case 'personality': return personalityAnswer(chart);
    case 'love': return loveAnswer(chart);
    case 'career': return careerAnswer(chart);
    case 'wealth': return wealthAnswer(chart);
    case 'health': return healthAnswer(chart);
    case 'daxian': return daXianAnswer(chart);
    case 'year': return yearAnswer(chart, question);
    case 'palace': return palaceAnswer(chart, question);
    case 'sihua': return siHuaAnswer(chart, question);
    default: return generalAnswer(chart, question);
  }
}
