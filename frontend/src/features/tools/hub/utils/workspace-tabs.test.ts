import { describe, expect, it } from 'vitest'
import viCatalog from '@/i18n/messages/vi/catalog.json'
import { WORKSPACE_TAB_GROUPS } from '../config/workspace-tabs'
import { VI_TOOL_CATALOG } from './tool-catalog.fixture'
import { workspaceTabsFor } from './workspace-tabs'

describe('workspaceTabsFor', () => {
  it('links every ready tool of the group by slug and marks the open one', () => {
    const set = workspaceTabsFor('qr-read', VI_TOOL_CATALOG, '/')
    expect(set?.groupId).toBe('qr')
    expect(set?.tabs.map((tab) => tab.to)).toEqual(['/tao-ma-qr', '/tao-ma-vach', '/doc-ma-qr', '/vietqr-chuyen-khoan'])
    expect(set?.tabs.filter((tab) => tab.current).map((tab) => tab.toolId)).toEqual(['qr-read'])
  })

  it('drops a switched-off tool instead of linking to the start page', () => {
    const set = workspaceTabsFor('qr-create', VI_TOOL_CATALOG.filter((tool) => tool.id !== 'vietqr'), '/')
    expect(set?.tabs.map((tab) => tab.toolId)).toEqual(['qr-create', 'barcode-create', 'qr-read'])
  })

  it('draws no bar outside every group, or when one tool is left', () => {
    expect(workspaceTabsFor('merge-pdf', VI_TOOL_CATALOG, '/')).toBeNull()
    expect(workspaceTabsFor('qr-create', VI_TOOL_CATALOG.filter((tool) => !['barcode-create', 'qr-read', 'vietqr'].includes(tool.id)), '/')).toBeNull()
  })

  it('keeps the branch base in every link', () => {
    expect(workspaceTabsFor('money-calc', VI_TOOL_CATALOG, '/doc-tools')?.tabs[0].to).toBe('/doc-tools/tinh-tien')
  })
})

describe('WORKSPACE_TAB_GROUPS', () => {
  it('names ready tools only, each in one group at most, with a label', () => {
    const seen = new Set<string>()
    for (const group of WORKSPACE_TAB_GROUPS) {
      expect(viCatalog.workspaceTabs[group.id]).toBeTruthy()
      for (const id of group.toolIds) {
        expect(VI_TOOL_CATALOG.find((tool) => tool.id === id)?.status, id).toBe('ready')
        expect(seen.has(id), id).toBe(false)
        seen.add(id)
      }
    }
  })
})
