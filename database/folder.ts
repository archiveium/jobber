import { sql } from '../database/index';
import { Folder } from '../interface/folder';
import { FolderDeleted, FolderNotFound } from '../exception/folder';

export async function getFoldersByUserAndAccount(userId: number, accountId: number): Promise<Folder[]> {
    return sql<Folder[]>`SELECT * 
    FROM folders 
    WHERE user_id = ${userId} and account_id = ${accountId}`;
}

export async function getFolder(folderId: number): Promise<Folder> {
    const folders = await sql<Folder[]>`SELECT * FROM folders WHERE id = ${folderId}`;
    if (folders.length > 0) {
        const folder = folders[0];
        if (folder.deleted) {
            throw new FolderDeleted(`Folder ${folderId} was deleted`);
        }
        return folder;
    }

    throw new FolderNotFound(`Folder ${folderId} was not found`);
}

export function updateFolder(id: number, uidValidity: number, lastUpdatedMsgNo: number, count: number) {
    return sql`UPDATE folders 
    SET status_messages = ${count}, status_uidvalidity = ${uidValidity}, last_updated_msgno = ${lastUpdatedMsgNo} 
    WHERE id = ${id}`;
}