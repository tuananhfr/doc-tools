import 'reflect-metadata'
import 'dotenv/config'
import { NestFactory } from '@nestjs/core'
import type { NestFastifyApplication } from '@nestjs/platform-fastify'
import { createHttpAdapter } from './config/http-adapter'
import { AppModule } from './app.module'
import { configuration } from './config/configuration'
async function bootstrap() {
  const config = configuration()
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, createHttpAdapter(), { bodyParser: false })
  app.setGlobalPrefix('api/v1')
  app.enableShutdownHooks()
  await app.listen(config.port, config.host)
}
void bootstrap()
