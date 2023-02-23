import { logger } from '../utils/logger';
import { getAllSyncingAccounts } from '../database/account';
import { SyncingAccount } from '../interface/account';
import { buildClient } from '../imap/builder';
import { getAllIMAPFolders } from '../imap';
import { getFoldersByUserAndAccount, insertFolder, softDeleteFolder, updateFolderName } from '../database/folder';
import { Folder } from '../interface/folder';
import { ImapFlow, ListResponse } from 'imapflow';
import _ from 'lodash';
import { IMAPGenericException, IMAPTooManyRequests } from '../exception/imap';

export async function scanner(): Promise<void> {
    logger.info('Started running scanner');

    const allSyncingAccounts = await getAllSyncingAccounts();
    const promises = allSyncingAccounts.map((syncingAccount) => {
        return syncAccount(syncingAccount);
    });

    await Promise.all(promises);

    logger.info('Finished running scanner');
}

// TEST Add a test case where one of the localfolder isn't processed
async function syncAccount(account: SyncingAccount): Promise<void> {
    logger.info(`Syncing Account ID ${account.id}`);

    let imapClient: ImapFlow;
    try {
        imapClient = await buildClient(account.username, account.password);
    } catch (error) {
        if (error instanceof IMAPTooManyRequests) {
            logger.warn(`Too many requests, skipping account id ${account.id}. Error: ${error.message}`);
            return;
        } else if (error instanceof IMAPGenericException) {
            logger.error(`${error.message} for account id ${account.id}. Skipping account`);
            return;
        }
        throw error;
    }

    const remoteFolders = await getAllIMAPFolders(imapClient);
    await imapClient.logout();

    const localFolders = await getFoldersByUserAndAccount(account.user_id, account.id, false);
    let processedFolders: Folder[] = [];

    for (let i = 0; i < remoteFolders.length; i++) {
        const syncedSavedFolder = getSyncedSavedFolder(localFolders, remoteFolders[i]);
        if (syncedSavedFolder) {
            const folderNameChanged = hasFolderNameChanged(syncedSavedFolder.name, remoteFolders[i].path);
            if (folderNameChanged) {
                const updateResult = await updateFolderName(syncedSavedFolder.id, remoteFolders[i].path);
                if (updateResult.count > 0) {
                    logger.info(`Renamed folder id ${syncedSavedFolder.id}`);
                    delete remoteFolders[i];
                } else {
                    logger.error(`Failed to rename folder id ${syncedSavedFolder.id}`);
                }
            } else {
                delete remoteFolders[i];
            }

            processedFolders.push(syncedSavedFolder);
        }
        // @ts-ignore since type definations have the parameters wrong
        else if (!remoteFolders[i].status) {
            delete remoteFolders[i];
        } else {
            // @ts-ignore since type definations have the parameters wrong
            if (remoteFolders[i].status.messages > 0) {
                // TODO Save name separately from remote folder path
                logger.info(`Folder ${remoteFolders[i].name} doesn't exist in database`);
                const insertedFolderId = await insertFolder({
                    account_id: account.id,
                    user_id: account.user_id,
                    name: remoteFolders[i].path,
                    // @ts-ignore since type definations have the parameters wrong
                    status_uidvalidity: remoteFolders[i].status.uidValidity,
                    // @ts-ignore since type definations have the parameters wrong
                    status_messages: remoteFolders[i].status.messages
                });
                delete remoteFolders[i];
                logger.info(`Inserted folder with id ${insertedFolderId}`);
            } else {
                delete remoteFolders[i];
            }
        }
    }

    const remoteFolderDeletes = _.pullAllBy(localFolders, processedFolders);
    remoteFolderDeletes?.map(async deletedFolder => {
        await softDeleteFolder(deletedFolder.id);
        logger.info(`Soft deleted folder ${deletedFolder.id}`);
    });

    logger.info(`Finished syncing account ID ${account.id}`);
}

function hasFolderNameChanged(savedFolderName: string, remoteFolderName: string): boolean {
    return savedFolderName.toLowerCase() !== remoteFolderName.toLowerCase();
}

function getSyncedSavedFolder(localFolders: Folder[], remoteFolder: ListResponse): Folder|undefined {
    // @ts-ignore since type definations have the parameters wrong
    if (remoteFolder.status) {
        // @ts-ignore since type definations have the parameters wrong
        return _.find(localFolders, function(o) {
            // @ts-ignore since type definations have the parameters wrong
            return o.status_uidvalidity === Number(remoteFolder.status.uidValidity);
        });
    }
}