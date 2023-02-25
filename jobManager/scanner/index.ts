import { logger } from '../../utils/logger';
import { getAllSyncingAccounts } from '../../database/account';
import { SyncingAccount } from '../../interface/account';
import { buildClient } from '../../imap/builder';
import { getAllIMAPFolders } from '../../imap';
import { insertFolder, restoreFolder, softDeleteFolder, updateFolderName } from '../../database/folder';
import { Folder } from '../../interface/folder';
import { ImapFlow } from 'imapflow';
import _ from 'lodash';
import { IMAPGenericException, IMAPTooManyRequests, IMAPUserAuthenticatedNotConnected } from '../../exception/imap';
import { providerFactory } from './providerFactory';

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
        imapClient = await buildClient(account.username, account.password, account.provider_host);
    } catch (error) {
        if (error instanceof IMAPTooManyRequests) {
            logger.warn(`Too many requests, skipping account id ${account.id}. Error: ${error.message}`);
            return;
        } else if (error instanceof IMAPGenericException || error instanceof IMAPUserAuthenticatedNotConnected) {
            logger.error(`${error.message} for account id ${account.id}. Skipping account`);
            return;
        }
        throw error;
    }

    const remoteFolders = await getAllIMAPFolders(imapClient);
    await imapClient.logout();

    const provider = providerFactory(account.provider_name);
    const localFolders = await provider.getAllSyncedLocalFolders(account.user_id, account.id);
    let processedFolders: Folder[] = [];

    for (let i = 0; i < remoteFolders.length; i++) {
        const syncedSavedFolder = provider.getSyncedLocalFolder(localFolders, remoteFolders[i]);
        if (syncedSavedFolder) {
            // TODO Compare only the folder name not path & store path separately
            const folderNameChanged = provider.hasFolderNameChanged(syncedSavedFolder.name, remoteFolders[i].path);
            if (folderNameChanged) {
                const updateResult = await updateFolderName(syncedSavedFolder.id, remoteFolders[i].path);
                if (updateResult.count > 0) {
                    logger.info(`Renamed folder id ${syncedSavedFolder.id}`);
                    delete remoteFolders[i];
                } else {
                    logger.error(`Failed to rename folder id ${syncedSavedFolder.id}`);
                }
            } else if (syncedSavedFolder.deleted_remote) {
                await restoreFolder(syncedSavedFolder.id);
                delete remoteFolders[i];
                logger.info(`Restored folder id ${syncedSavedFolder.id}`);
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
        if (!deletedFolder.deleted_remote) {
            await softDeleteFolder(deletedFolder.id);
            logger.info(`Soft deleted folder ${deletedFolder.id}`);
        }
    });

    logger.info(`Finished syncing account ID ${account.id}`);
}