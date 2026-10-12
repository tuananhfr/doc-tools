import {describe,it,expect} from 'vitest'
import {WORKSPACE_REGISTRY} from './workspace-registry'
import {TOOL_CATALOG} from '@/features/tools/hub/config/tool-catalog'
describe('incremental workspace adapters',()=>{
  it('binds each adapter to a ready Free tool without duplicate template IDs',()=>{
    for(const[id,entry]of Object.entries(WORKSPACE_REGISTRY)){
      expect(TOOL_CATALOG.find(tool=>tool.id===id)?.status,id).toBe('ready')
      expect(new Set(entry.templates.map(template=>template.id)).size).toBe(entry.templates.length)
      expect(entry.templates.length).toBeGreaterThan(0)
      expect(entry.exports.length).toBeGreaterThan(0)
    }
  })
})
import {WORKSPACE_FAMILIES} from './workspace-registry'
it('keeps nine module owners explicit while excluding advanced ERPCons lookups',()=>{
  expect(new Set(WORKSPACE_FAMILIES.map(item=>item.id)).size).toBe(9)
  expect(WORKSPACE_FAMILIES.find(item=>item.id==='family-calendar')?.owner).toBe('family-calendar')
  expect(WORKSPACE_FAMILIES.filter(item=>item.owner==='free')).toHaveLength(8)
  expect(TOOL_CATALOG.some(tool=>['construction-price','planning-lookup','construction-law','construction-standards','dossier-check'].includes(tool.id))).toBe(false)
})
