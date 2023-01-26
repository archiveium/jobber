import postgres from 'postgres';
import config from 'config';

// TODO Remove 'any' usage
const dbConfig = config.get('database') as any;

export const sql = postgres({...dbConfig});