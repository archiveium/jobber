import { sql } from '../database/index';
import { SyncingAccount } from '../interface/account';

export function getAllSyncingAccounts(): Promise<SyncingAccount[]> {
    return sql<SyncingAccount[]>`SELECT id, username, password, user_id, provider_id 
    FROM accounts 
    WHERE syncing = true;`;
}