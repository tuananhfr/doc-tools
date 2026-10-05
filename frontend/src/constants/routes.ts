import { appConfig } from '@/config/app.config'
const erp = appConfig.erpconsUrl.replace(/[/]+$/, '')
export const ROUTES = { docTools: '/', tools: erp + '/tools', login: erp + '/login' } as const
