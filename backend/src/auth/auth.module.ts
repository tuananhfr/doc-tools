import { Module } from '@nestjs/common'
import { AccountsModule } from '../accounts/accounts.module'
import { DatabaseModule } from '../database/database.module'
import { MailModule } from '../mail/mail.module'
import { RolesModule } from '../roles/roles.module'
import { SessionModule } from '../session/session.module'
import { AuthController } from './auth.controller'
import { AuthFloodRepository } from './auth-flood.repository'
import { AuthService } from './auth.service'
import { OtpRepository } from './otp.repository'
import { SecurityController } from './security.controller'

@Module({
  imports: [DatabaseModule, MailModule, AccountsModule, SessionModule, RolesModule],
  controllers: [AuthController, SecurityController],
  providers: [OtpRepository, AuthFloodRepository, AuthService],
  // The admin area re-asks the password before secrets change.
  exports: [AuthService],
})
export class AuthModule {}
