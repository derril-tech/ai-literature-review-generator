import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { HealthController } from './controllers/health.controller';
import { RequestContextMiddleware } from './middleware/request-context.middleware';
import { UploadsController } from './controllers/uploads.controller';
import { NatsService } from './services/nats.service';
import { ThemesController } from './controllers/themes.controller';
import { DocumentsController } from './controllers/documents.controller';
import { ExportsController } from './controllers/exports.controller';
import { AuditMiddleware } from './middleware/audit.middleware';
import { AuthModule } from './auth/auth.module';
import { Organization } from './entities/org.entity';
import { Project } from './entities/project.entity';
import { Document } from './entities/document.entity';
import { Section } from './entities/section.entity';
import { Theme } from './entities/theme.entity';
import { Export } from './entities/export.entity';
import { AuditLog } from './entities/audit-log.entity';
import { User } from './entities/user.entity';
import { Membership } from './entities/membership.entity';

@Module({
  imports: [
    ConfigModule.forRoot(),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'airg',
      entities: [Organization, Project, Document, Section, Theme, Export, AuditLog, User, Membership],
      synchronize: false,
      logging: process.env.NODE_ENV === 'development',
    }),
    TypeOrmModule.forFeature([Organization, Project, Document, Section, Theme, Export, AuditLog, User, Membership]),
    AuthModule,
  ],
  controllers: [
    HealthController,
    UploadsController,
    ThemesController,
    DocumentsController,
    ExportsController,
  ],
  providers: [NatsService, RequestContextMiddleware, AuditMiddleware],
})
export class AppModule {}
