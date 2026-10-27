import { request } from './http'

export interface AskAnswer {
  question: string
  answer: string
  /** 当前阶段返回的是明确标记的模拟内容，接入真实模型后该字段应为 false。 */
  isMock: boolean
  followUpSuggestions: string[]
}

/** POST /api/chat —— 提交一个学习问题。目前由后端返回模拟解释。 */
export function askQuestion(question: string): Promise<AskAnswer> {
  return request<AskAnswer>('/api/chat', {
    method: 'POST',
    body: JSON.stringify({ question }),
  })
}
