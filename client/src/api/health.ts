import { request } from './http'

export interface HealthData {
  status: 'ok'
  uptimeSeconds: number
  timestamp: string
}

/** GET /api/health —— 后端健康检查，用于确认前后端链路是否打通。 */
export function fetchHealth(): Promise<HealthData> {
  return request<HealthData>('/api/health')
}
