import { Injectable } from '@nestjs/common'
import { SettingsService } from '../settings/settings.service'

/**
 * PI Holding "Mẫu để thử" (try-a-sample) entry points: a single operational flag gates every
 * one of them. There is no catalog table — manifests are static review deliverables
 * (`docs/pi-holding-templates/manifests/*.json`, kept out of the running app); the frontend
 * only ever needs this one boolean to decide whether to render a sample button at all.
 * Default OFF until BU/CMO review (see `settings.definitions.ts`).
 */
@Injectable()
export class TemplatesService {
  constructor(private readonly settings: SettingsService) {}

  async config() {
    return { ok: true, enabled: await this.settings.get('templates.piholding.enabled') }
  }
}
