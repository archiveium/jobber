import postgres from 'postgres';
import config from 'config';
import { DatabaseConfig } from '../interface/config';

const dbConfig = config.get<DatabaseConfig>('database');

export const sql = postgres({...dbConfig});