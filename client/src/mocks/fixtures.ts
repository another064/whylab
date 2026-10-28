/**
 * Sample data for pages whose backend endpoints don't exist yet.
 * Copy comes from the design canvas. Each api/*.ts module that reads from here
 * marks its result with `isMock: true`; replace the module body with a real
 * request() call once the endpoint lands and the pages keep working.
 */
import type { NodeDetail, NodeSummary } from '@/api/library'
import type { Pattern } from '@/api/profile'
import type { ReviewItem } from '@/api/review'

/** Simulated network latency so loading states are exercised during development. */
export function mockDelay<T>(value: T, ms = 220): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(structuredClone(value)), ms))
}

export const reviewQueue: ReviewItem[] = [
  {
    id: 'ri-closure',
    spaceTitle: 'JavaScript 基础',
    prompt: '不看任何资料，讲讲：闭包为什么能访问外部函数的变量？',
    attemptCount: 2,
    lastPerformance: 'hard',
    lastReviewedLabel: '2 天前',
  },
  {
    id: 'ri-matrix',
    spaceTitle: '线性代数',
    prompt: '矩阵乘法为什么不满足交换律？试着用一个具体的 2×2 例子说明。',
    attemptCount: 4,
    lastPerformance: 'good',
    lastReviewedLabel: '5 天前',
  },
  {
    id: 'ri-entropy',
    spaceTitle: '热力学',
    prompt: '熵为什么不会自发减少？从微观状态数的角度讲一遍。',
    attemptCount: 0,
    lastPerformance: null,
    lastReviewedLabel: null,
  },
  {
    id: 'ri-this',
    spaceTitle: 'JavaScript 基础',
    prompt: '箭头函数里的 this 为什么和普通函数不一样？',
    attemptCount: 1,
    lastPerformance: 'again',
    lastReviewedLabel: '1 天前',
  },
  {
    id: 'ri-rank',
    spaceTitle: '线性代数',
    prompt: '矩阵的秩代表什么？为什么行秩等于列秩？',
    attemptCount: 3,
    lastPerformance: 'good',
    lastReviewedLabel: '6 天前',
  },
  {
    id: 'ri-first-law',
    spaceTitle: '热力学',
    prompt: '热力学第一定律和能量守恒是什么关系？',
    attemptCount: 2,
    lastPerformance: 'easy',
    lastReviewedLabel: '12 天前',
  },
]

export const nodes: NodeDetail[] = [
  {
    id: 'n-closure',
    spaceId: 'mock-js',
    spaceTitle: 'JavaScript 基础',
    question: '闭包为什么能访问外部函数的变量？',
    explanationCount: 2,
    understandingCount: 1,
    reviewCount: 3,
    activeRound: null,
    updatedLabel: '2 天前',
    understanding: {
      text: '闭包 = 函数 + 它出生时的词法环境。环境只要还被引用，就不会被回收，所以变量还在。',
      source: '10 月 26 日写下 · 来自追问小结',
    },
    explanation:
      '内部函数创建时会记住自己所在的“词法环境”。只要内部函数还被引用，这个环境就不会被垃圾回收，变量也就还在。',
    extraExplanations: 1,
    dependsOn: [
      { title: '词法作用域', mastered: true },
      { title: '垃圾回收的可达性', mastered: false },
    ],
    reviewHistory: ['again', 'hard', 'hard'],
    nextReviewLabel: '今天',
  },
  {
    id: 'n-microtask',
    spaceId: 'mock-js',
    spaceTitle: 'JavaScript 基础',
    question: '微任务为什么比定时器先执行？',
    explanationCount: 0,
    understandingCount: 0,
    reviewCount: 0,
    activeRound: { depth: 3, maxDepth: 6 },
    updatedLabel: '昨天',
    understanding: null,
    explanation: null,
    extraExplanations: 0,
    dependsOn: [{ title: '事件循环', mastered: false }],
    reviewHistory: [],
    nextReviewLabel: null,
  },
  {
    id: 'n-arrow-this',
    spaceId: 'mock-js',
    spaceTitle: 'JavaScript 基础',
    question: 'this 在箭头函数里为什么不一样？',
    explanationCount: 1,
    understandingCount: 0,
    reviewCount: 1,
    activeRound: null,
    updatedLabel: '4 天前',
    understanding: null,
    explanation: '箭头函数没有自己的 this，它直接沿用定义时外层作用域的 this。',
    extraExplanations: 0,
    dependsOn: [{ title: '词法作用域', mastered: true }],
    reviewHistory: ['again'],
    nextReviewLabel: '明天',
  },
  {
    id: 'n-matrix',
    spaceId: 'mock-la',
    spaceTitle: '线性代数',
    question: '矩阵乘法为什么不满足交换律？',
    explanationCount: 1,
    understandingCount: 2,
    reviewCount: 5,
    activeRound: null,
    updatedLabel: '3 天前',
    understanding: {
      text: '矩阵乘法是“先做一个变换再做另一个”，先旋转再拉伸和先拉伸再旋转，结果不一样。',
      source: '10 月 25 日写下 · 来自解释后的复述',
    },
    explanation: '矩阵对应线性变换，乘法对应变换的复合。复合的顺序不同，得到的变换一般不同。',
    extraExplanations: 0,
    dependsOn: [{ title: '线性变换', mastered: true }],
    reviewHistory: ['hard', 'good', 'good', 'easy', 'good'],
    nextReviewLabel: '5 天后',
  },
  {
    id: 'n-entropy',
    spaceId: 'mock-thermo',
    spaceTitle: '热力学',
    question: '熵为什么不会自发减少？',
    explanationCount: 1,
    understandingCount: 0,
    reviewCount: 0,
    activeRound: null,
    updatedLabel: '5 天前',
    understanding: null,
    explanation: '孤立系统的微观状态数趋向最多，这就是熵增的统计含义。',
    extraExplanations: 0,
    dependsOn: [{ title: '微观状态与宏观状态', mastered: false }],
    reviewHistory: [],
    nextReviewLabel: '今天',
  },
]

export const recentNodes: NodeSummary[] = [
  { id: 'n-closure', kind: 'understanding', text: '闭包 = 函数 + 它出生时的词法环境，环境被引用就不会被回收。', spaceTitle: 'JavaScript 基础', when: '2 天前' },
  { id: 'n-matrix', kind: 'question', text: '如果 AB = BA 对所有 B 成立，A 一定是什么样的矩阵？', spaceTitle: '线性代数', when: '3 天前' },
  { id: 'n-entropy', kind: 'explanation', text: '孤立系统的微观状态数趋向最多，这就是熵增的统计含义。', spaceTitle: '热力学', when: '5 天前' },
]

export const patterns: Pattern[] = [
  {
    id: 'p-boundary',
    category: 'questioning',
    statement: '你常问“为什么成立”，很少问“什么时候不成立”。',
    evidence: [
      '“为什么矩阵乘法不满足交换律？”',
      '“为什么熵会增加？”',
      '“为什么闭包能访问外部变量？”',
    ],
    evidenceSource: '最近 3 次对话中的提问',
    effect: '讲解末尾会多带一个“边界情况”的追问。',
    status: 'proposed',
    evidenceCount: 3,
  },
  {
    id: 'p-stored-in-fn',
    category: 'misconception',
    statement: '你有时把“变量能被访问”和“变量被存进了函数”当成一回事。',
    evidence: ['“变量还在，是因为它们存在内部函数里面了。”'],
    evidenceSource: '今天的回忆 · 上周讲 this 时的回答',
    effect: '相关回忆题会专门问到“引用”这一点。',
    status: 'proposed',
    evidenceCount: 2,
  },
  {
    id: 'p-analogy',
    category: 'effective_strategy',
    statement: '先给一个生活里的类比，再上定义，你通常一次就懂。',
    evidence: [],
    evidenceSource: '',
    effect: '已用于讲解',
    status: 'confirmed',
    evidenceCount: 5,
  },
  {
    id: 'p-def-to-example',
    category: 'reasoning_gap',
    statement: '从“定义”走到“具体例子”这一步，你常需要一条线索。',
    evidence: [],
    evidenceSource: '',
    effect: '追问时会在这里多问一层',
    status: 'confirmed',
    evidenceCount: 4,
  },
  {
    id: 'p-correlation',
    category: 'misconception',
    statement: '“把相关当成因果”——最近 3 次相关回忆里都没再出现。',
    evidence: [],
    evidenceSource: '',
    effect: '',
    status: 'maybe_overcome',
    evidenceCount: 6,
  },
]

export const masteredConcepts = ['词法作用域', '矩阵的秩', '热力学第一定律']
