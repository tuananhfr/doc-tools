import axios from 'axios'
import { appConfig } from '@/config/app.config'
import { toApiError } from './error'
export { ApiError, API_ERROR_KIND, toApiError } from './error'

export const client = axios.create({ baseURL: appConfig.apiBaseUrl, timeout: 15000 })
client.interceptors.response.use(response => response, error => Promise.reject(toApiError(error)))
declare module 'axios' {
  interface AxiosRequestConfig { skipSessionExpired?: boolean; skipOutbox?: boolean }
}
export const http = {
  async get<T>(url: string, params?: unknown): Promise<T> { return (await client.get<T>(url, { params })).data },
  async post<T>(url: string, data?: unknown): Promise<T> { return (await client.post<T>(url, data)).data },
}
