import { Module } from '@nestjs/common';
import { HealthController } from '../controllers/health.controller';
import { UploadsController } from '../controllers/uploads.controller';
import { MiddlewareConsumer, NestModule } from '@nestjs/common';
import { RequestContextMiddleware } from '../middleware/request-context.middleware';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { typeOrmAsyncConfig } from '../config/typeorm.config';
import { Document } from '../entities/document.entity';
import { Theme } from '../entities/theme.entity';
import { DocumentsController } from '../controllers/documents.controller';
import { ThemesController } from '../controllers/themes.controller';
import { NatsService } from '../services/nats.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync(typeOrmAsyncConfig),
    TypeOrmModule.forFeature([Document, Theme])
  ],
  controllers: [HealthController, UploadsController, DocumentsController, ThemesController],
  providers: [NatsService]
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestContextMiddleware).forRoutes('*');
  }
}

