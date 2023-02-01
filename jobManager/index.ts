import { sql } from '../database/index';
import { EmailJobPayload, Job } from '../interface/job';
import { Folder } from '../interface/folder';
import { Account } from '../interface/account';
import { FolderNotFound } from '../exception/foldernotfound';
import { AccountNotFound } from '../exception/accountnotfound';
import { DefaultJobPayload } from '../interface/defaultJobPayload';
const phpUnserialize = require('phpunserialize');

export function getJob(queue: string): Promise<Job[]> {
    return sql<Job[]>`SELECT * FROM jobs 
    WHERE queue = ${queue} AND reserved_at IS NULL 
    ORDER BY id 
    ASC LIMIT 1`;
}

export async function getFolder(folderId: number): Promise<Folder> {
    const folder = await sql<Folder[]>`SELECT * FROM folders WHERE id = ${folderId}`;
    if (folder.length > 0) {
        return folder[0];
    }

    throw new FolderNotFound(`${folderId} was not found`);
}

export async function getAccount(userId: number, accountId: number): Promise<Account> {
    const account = await sql<Account[]>`SELECT * FROM accounts WHERE user_id = ${userId} AND id = ${accountId}`;
    if (account.length > 0) {
        return account[0];
    }

    throw new AccountNotFound(`Account ID ${accountId} not found for User ID ${userId}`);
}

export function updateFolder(id: number, uidValidity: number, lastUpdatedMsgNo: number, count: number) {
    return sql`UPDATE folders 
    SET status_messages = ${count}, status_uidvalidity = ${uidValidity}, last_updated_msgno = ${lastUpdatedMsgNo} 
    WHERE id = ${id}`;
}

export async function createJob(payload: string): Promise<number> {
    const unixTimestamp = Math.floor(Date.now() / 1000);
    const result = await sql`INSERT INTO jobs (queue, payload, attempts, reserved_at, available_at, created_at)
    VALUES ('email', ${payload}, 1, null, ${unixTimestamp}, ${unixTimestamp})
    RETURNING id;`;
    return result.count > 0 ? result[0].id : 0;
}

export function acquireJobLock(jobId: number) {
    const unixTimestamp = Math.floor(Date.now() / 1000);
    return sql`UPDATE jobs SET reserved_at = ${unixTimestamp} WHERE id = ${jobId}`;
}

export async function deleteJob(jobId: number): Promise<boolean> {
    const result = await sql`DELETE FROM jobs WHERE id = ${jobId};`;
    return result.count === 1;
}

export function parseEmailJobPayload(payload: string): EmailJobPayload {
    const { folderId, messageNumbers } = JSON.parse(payload);
    return {
        folderId,
        messageNumbers
    };
}

export function parseDefaultJobPayload(payload: string): DefaultJobPayload {
    return <DefaultJobPayload>phpUnserialize(
        JSON.parse(payload).data.command
    );
}