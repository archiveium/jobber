import { sql } from '../database/index';
import { Folder } from '../interface/folder';
// import { FolderNotFound } from '../exception/foldernotfound';

export async function getFoldersByUserAndAccount(userId: number, accountId: number): Promise<Folder[]> {
    return sql<Folder[]>`SELECT * 
    FROM folders 
    WHERE user_id = ${userId} and account_id = ${accountId}`;
}