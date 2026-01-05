import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { UserContextRecord } from '../models/user-context-record';
import { ModuleRun } from '../models/module-run';
import { CouncilDecision } from '../models/council-decision';
import { KeywordGapItem } from '../models/keyword-gap-item';
import { OverrideEvent } from '../models/override-event';

const isProduction = process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || (isTest ? 'ucr_platform_test' : 'ucr_platform'),
  synchronize: !isProduction, // Auto-create tables in non-production
  dropSchema: isTest, // Only drop schema in test environment
  logging: !isProduction,
  entities: [
    UserContextRecord,
    ModuleRun,
    CouncilDecision,
    KeywordGapItem,
    OverrideEvent,
  ],
  migrations: ['dist/migrations/*.js'],
  subscribers: [],
  extra: {
    ssl: isProduction ? { rejectUnauthorized: false } : false,
  },
});
