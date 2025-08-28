import { TypeOrmModuleAsyncOptions } from '@nestjs/typeorm';
import { loadConfig } from './configuration';

export const typeOrmAsyncConfig: TypeOrmModuleAsyncOptions = {
  useFactory: async () => {
    const cfg = loadConfig();
    return {
      type: 'postgres',
      host: cfg.database.host,
      port: cfg.database.port,
      username: cfg.database.user,
      password: cfg.database.password,
      database: cfg.database.name,
      autoLoadEntities: true,
      synchronize: false
    } as const;
  }
};

