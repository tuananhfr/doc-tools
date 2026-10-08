import { Module } from '@nestjs/common'
import { AccountsModule } from '../accounts/accounts.module'
import { DatabaseModule } from '../database/database.module'
import { MailModule } from '../mail/mail.module'
import { RolesModule } from '../roles/roles.module'
import { SessionModule } from '../session/session.module'
import { AuthController } from './auth.controller'
import { AuthFloodRepository } from './auth-flood.repository'
import { AuthService } from './auth.service'
import { EmailChangeService } from './email-change.service'
import { OtpRepository } from './otp.repository'
import { SecurityController } from './security.controller'

@Module({
  imports: [DatabaseModule, MailModule, AccountsModule, SessionModule, RolesModule],
  controllers: [AuthController, SecurityController],
  providers: [OtpRepository, AuthFloodRepository, AuthService, EmailChangeService],
  // The admin area re-asks the password before secrets change, and moves accounts to a new email for support.
  exports: [AuthService, EmailChangeService],
})
export class AuthModule {}
