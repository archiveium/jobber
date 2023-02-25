import { sql } from '../database/index';
import { DeletedAccount, SyncingAccount } from '../interface/account';
import { Account } from '../interface/account';
import { AccountDeleted, AccountNotFound, AccountSyncingPaused } from '../exception/account';
import { DatabaseDeleteFailed, DatabaseUpdateFailed } from '../exception/database';

export function getAllSyncingAccounts(): Promise<SyncingAccount[]> {
    return sql<SyncingAccount[]>`SELECT a.id, a.username, a.password, a.user_id, 
    p.host AS provider_host, p.name AS provider_name
    FROM accounts a
    INNER JOIN providers p ON a.provider_id = p.id
    WHERE a.syncing = true AND a.deleted = false;`;
}

export function getAllDeletedAccounts(): Promise<DeletedAccount[]> {
    return sql<DeletedAccount[]>`SELECT id, user_id, provider_id 
    FROM accounts 
    WHERE deleted = true;`;
}

export async function getAccount(userId: number, accountId: number): Promise<Account> {
    const accounts = await sql<Account[]>`SELECT a.*, p.host AS provider_host
    FROM accounts a
    INNER JOIN providers p ON a.provider_id = p.id
    WHERE a.user_id = ${userId} AND a.id = ${accountId};`;

    if (accounts.length > 0) {
        const account = accounts[0];
        if (account.deleted) {
            throw new AccountDeleted(`Account ${accountId} was deleted`);
        } else if (!account.syncing) {
            throw new AccountSyncingPaused(`Account syncing ${accountId} was paused`);
        }
        return account;
    }

    throw new AccountNotFound(`Account ${accountId} not found for User ID ${userId}`);
}

export async function updateAccountSyncing(id: number, syncing: boolean): Promise<void> {
    const result = await sql`UPDATE accounts 
    SET syncing = ${syncing} 
    WHERE id = ${id}`;

    if (result.count !== 1) {
        throw new DatabaseUpdateFailed('[updateAccountSyncing] Failed');
    }
}

export async function deleteAccount(id: number): Promise<void> {
    const result = await sql`DELETE FROM accounts WHERE id = ${id};`;
    if (result.count !== 1) {
        throw new DatabaseDeleteFailed(`Account ID ${id}`);
    }
}