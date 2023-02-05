import { getMessageNumbers, getFolderStatusByName } from '../imap/index';
import _ from 'lodash';
import { buildClient } from '../imap/builder';
import { ImapFlow } from 'imapflow';
import { ImapFolderStatus, MessageNumber } from '../interface/imap';
import { logger } from '../utils/logger';
import { getAllSyncingAccounts, updateAccountSyncing } from '../database/account';
import { getFolder, getFoldersByUserAndAccount, updateFolder } from '../database/folder';
import { Folder } from '../interface/folder';
import { createJob } from '../database/job';
import { AuthenticationFailed } from '../exception/imap';

const BATCH_SIZE: number = 100;

export async function schedule() {
    logger.info('Started running scheduler');

    const allSyncingAccounts = await getAllSyncingAccounts();
    allSyncingAccounts.forEach(async (syncingAccount) => {
        try {
            const imapClient = await buildClient(syncingAccount.username, syncingAccount.password);
            const accountFolders = await getFoldersByUserAndAccount(syncingAccount.user_id, syncingAccount.id);
            const promises = accountFolders.map(async (accountFolder) => {
                return processAccount(accountFolder, imapClient);
            });

            await Promise.all(promises);
            await imapClient.logout();
        } catch (error) {
            if (error instanceof AuthenticationFailed) {
                logger.error(`Authentication failed for Account ID ${syncingAccount.id}. Disabling account syncing`);
                await updateAccountSyncing(syncingAccount.id, false);
                // TODO send notification to user
            } else {
                logger.error(JSON.stringify(error));
                throw error;
            }
        }
    });
}

async function processAccount(accountFolder: Folder, imapClient: ImapFlow): Promise<void> {
    const folder = await getFolder(accountFolder.id);
    const imapFolderStatus = await getFolderStatusByName(imapClient, folder.name);
    const imapFolderLastUid = imapFolderStatus.uidNext - 1;

    if (_.isNull(folder.last_updated_msgno)) {
        if (imapFolderStatus.messages > 0) {
            const messageNumbers = await buildMessageNumbers(
                imapClient,
                folder.name,
                1,
                imapFolderLastUid,
            );
            await processMessageNumbers(messageNumbers, folder.account_id, folder.id, imapFolderStatus);
        } else {
            logger.info(`FolderId ${accountFolder.id} has 0 messages to sync`);
        }
    } else {
        if (folder.status_uidvalidity != imapFolderStatus.uidValidity) {
            // TODO Migrate scan:provider-folder-changes job from PHP
            logger.warn(`FolderId ${accountFolder.id} uidvalidity changed.
            This error should fix itself after scan:provider-folder-changes job runs`);
            // FIXME Throw Exception
        } else if (imapFolderStatus.messages == 0) {
            logger.info(`FolderId ${accountFolder.id} has 0 messages to sync`);
        } else if (folder.last_updated_msgno == imapFolderLastUid) {
            logger.info(`FolderId ${accountFolder.id} has no new messages to sync`);
        } else {
            const messageNumbers = await buildMessageNumbers(
                imapClient,
                folder.name,
                folder.last_updated_msgno + 1,
                imapFolderLastUid,
            );
            await processMessageNumbers(messageNumbers, folder.account_id, folder.id, imapFolderStatus);
        }
    }
}

async function processMessageNumbers(
    messageNumbers: MessageNumber[],
    accountId: number,
    folderId: number,
    imapFolderStatus: ImapFolderStatus
): Promise<void> {
    if (messageNumbers.length > 0) {
        const jobId = await createJob(JSON.stringify({ accountId, folderId, messageNumbers }));
        logger.info(`Created job ${jobId} to process ${messageNumbers.length} emails`);

        const updateResult = await updateFolder(
            folderId,
            imapFolderStatus.uidValidity,
            messageNumbers[messageNumbers.length - 1].uid,
            imapFolderStatus.messages,
        );

        if (updateResult.count != 1) {
            logger.error(`Updated inadequate no. of rows: ${updateResult.count}`);
        }
    }
}

async function buildMessageNumbers(
    imapClient: ImapFlow,
    folderName: string,
    lastUpdatedMsgNo: number,
    imapFolderLastUid: number
): Promise<MessageNumber[]> {
    let messageNumbers = await getMessageNumbers(imapClient, folderName, lastUpdatedMsgNo, imapFolderLastUid);
    messageNumbers = _.sortBy(messageNumbers, ['uid']);
    return messageNumbers.slice(0, BATCH_SIZE);
}