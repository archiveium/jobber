import { sql } from '../database/index';
import { Folder, InsertFolder } from '../interface/folder';
import { FolderDeleted, FolderDeletedOnRemote, FolderNotFound } from '../exception/folder';
import { DatabaseInsertFailed, DatabaseUpdateFailed } from '../exception/database';
import { DateTime } from 'luxon';

export async function getFoldersByUserAndAccount(
    userId: number,
    accountId: number,
    remoteDeleted = true
): Promise<Folder[]> {
    return sql<Folder[]>`SELECT * 
    FROM folders 
    WHERE user_id = ${userId} and 
        deleted = false and 
        deleted_remote = ${remoteDeleted} and 
        account_id = ${accountId}`;
}

export async function getFolder(folderId: number): Promise<Folder> {
    const folders = await sql<Folder[]>`SELECT * FROM folders WHERE id = ${folderId}`;
    if (folders.length > 0) {
        const folder = folders[0];
        if (folder.deleted) {
            throw new FolderDeleted(`Folder ${folderId} was deleted`);
        } else if (folder.deleted_remote) {
            throw new FolderDeletedOnRemote(`Folder ${folderId} was deleted on remote`);
        }
        return folder;
    }

    throw new FolderNotFound(`Folder ${folderId} was not found`);
}

export async function insertFolder(folder: InsertFolder): Promise<number> {
    const dateTime = DateTime.now().toString();
    const result = await sql`INSERT INTO folders 
    (user_id, account_id, name, status_uidvalidity, status_messages, created_at)
    VALUES (
        ${folder.user_id}, 
        ${folder.account_id}, 
        ${folder.name}, 
        ${folder.status_uidvalidity}, 
        ${folder.status_messages}, 
        ${dateTime}
    ) RETURNING id;`;

    if (result.count === 1) {
        return result[0].id;
    }
    throw new DatabaseInsertFailed(`Failed to insert folder for user:${folder.user_id}, account:${folder.account_id}`);
}

export function updateFolder(id: number, uidValidity: number, lastUpdatedMsgNo: number, count: number) {
    return sql`UPDATE folders 
    SET status_messages = ${count}, status_uidvalidity = ${uidValidity}, last_updated_msgno = ${lastUpdatedMsgNo} 
    WHERE id = ${id}`;
}

export function updateFolderName(id: number, name: string) {
    return sql`UPDATE folders SET name = ${name} WHERE id = ${id}`;
}

export async function softDeleteFolder(id: number): Promise<void> {
    const result = await sql`UPDATE folders SET deleted_remote = true WHERE id = ${id}`;
    if (result.count !== 1) {
        throw new DatabaseUpdateFailed(`Failed to update folder ${id}`);
    }
}