import { Global, Module } from '@nestjs/common';
import { db } from './db.js';

export const DB = Symbol('DB');
export type Db = typeof db;

@Global()
@Module({
  providers: [{ provide: DB, useValue: db }],
  exports: [DB],
})
export class PrismaModule {}
