import { sql } from '../database/index';
import { DeletedAccount, SyncingAccount } from '../interface/account';
import { Account } from '../interface/account';
import { AccountDeleted, AccountNotFound, AccountSyncingPaused } from '../exception/account';
import { DatabaseDeleteFailed, DatabaseUpdateFailed } from '../exception/database';

export function getAllSyncingAccounts(): Promise<SyncingAccount[]> {
    return sql<SyncingAccount[]>`SELECT id, username, password, user_id, provider_id 
    FROM accounts 
    WHERE syncing = true AND deleted = false;`;
}

export function getAllDeletedAccounts(): Promise<DeletedAccount[]> {
    return sql<DeletedAccount[]>`SELECT id, user_id, provider_id 
    FROM accounts 
    WHERE deleted = true;`;
}

export async function getAccount(userId: number, accountId: number): Promise<Account> {
    const accounts = await sql<Account[]>`SELECT * FROM accounts WHERE user_id = ${userId} AND id = ${accountId}`;
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

export async function updateAccountSyncing(id: number, syncing: boolean) {
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