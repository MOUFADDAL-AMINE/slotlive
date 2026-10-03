import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';

import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { AuthModule } from './auth/auth.module';
import { VenuesModule } from './venues/venues.module';

@Module({
  imports: [
    // Environment configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
    }),

    // Structured logging
    LoggerModule.forRoot({
      pinoHttp: {
        transport:
          process.env.NODE_ENV !== 'production'
            ? { target: 'pino-pretty', options: { colorize: true, singleLine: true } }
            : undefined,
        level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
        serializers: {
          req(req: { method: string; url: string }) {
            return {
              method: req.method,
              url: req.url,
            };
          },
        },
      },
    }),

    // Rate limiting
    ThrottlerModule.forRoot([{
      name: 'default',
      ttl: 60000,
      limit: 100,
    }]),

    // Core modules
    PrismaModule,
    RedisModule,
    HealthModule,
    AuthModule,
    VenuesModule,
  ],
})
export class AppModule {}
