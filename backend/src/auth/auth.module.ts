import { Module } from '@nestjs/common'
import { AccountsModule } from '../accounts/accounts.module'
import { DatabaseModule } from '../database/database.module'
import { MailModule } from '../mail/mail.module'
import { SessionModule } from '../session/session.module'
import { AuthController } from './auth.controller'
import { AuthFloodRepository } from './auth-flood.repository'
import { AuthService } from './auth.service'
import { OtpRepository } from './otp.repository'

@Module({
  imports: [DatabaseModule, MailModule, AccountsModule, SessionModule],
  controllers: [AuthController],
  providers: [OtpRepository, AuthFloodRepository, AuthService],
})
export class AuthModule {}
