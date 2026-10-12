import { describe, expect, it } from 'vitest'
import { deviceNeedKeys, offlineNoticeKey } from './tool-device'

describe('deviceNeedKeys', () => {
  it('shows only hardware needs; network is already said by the offline line', () => {
    expect(deviceNeedKeys({ offline: 'no', needs: ['mic', 'network'] })).toEqual(['mic'])
    expect(deviceNeedKeys({ offline: 'yes' })).toEqual([])
    expect(deviceNeedKeys({ offline: 'after-first-use', needs: ['camera'] })).toEqual(['camera'])
  })
})

describe('offlineNoticeKey', () => {
  it('is silent while online and never-offline', () => {
    expect(offlineNoticeKey({ offline: 'no', needs: ['network'] }, { online: true, wasOffline: false })).toBeNull()
  })
  it('names the tool level while offline', () => {
    expect(offlineNoticeKey({ offline: 'after-first-use' }, { online: false, wasOffline: false })).toBe('after-first-use')
    expect(offlineNoticeKey({ offline: 'yes' }, { online: false, wasOffline: true })).toBe('yes')
  })
  it('says the connection is back once', () => {
    expect(offlineNoticeKey({ offline: 'no', needs: ['network'] }, { online: true, wasOffline: true })).toBe('online')
  })
})
