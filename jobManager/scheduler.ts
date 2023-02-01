import { getJob, acquireJobLock, getFolder, deleteJob, parseDefaultJobPayload, getAccount, updateFolder, createJob } from '../jobManager/index';
import { getMessageNumbers, getFolderStatusByName } from '../imap/index';
import _ from 'lodash';
import { buildClient } from '../imap/builder';
import { ImapFlow } from 'imapflow';
import { ImapFolderStatus, MessageNumber } from '../interface/imap';
import { logger } from '../utils/logger';
import { getAllSyncingAccounts } from '../database/account';
import { getFoldersByUserAndAccount } from '../database/folder';
import { Folder } from '../interface/folder';

const BATCH_SIZE: number = 100;

export async function schedule() {
    logger.info('Started running scheduler');

    const allSyncingAccounts = await getAllSyncingAccounts();
    allSyncingAccounts.forEach(async (syncingAccount) => {
        // TODO If authentication fails, disable syncing & send notification to user
        const imapClient = await buildClient(syncingAccount.username, syncingAccount.password);

        const accountFolders = await getFoldersByUserAndAccount(syncingAccount.user_id, syncingAccount.id);
        const promises = accountFolders.map((accountFolder) => {
            return processAccount(accountFolder, imapClient);
        });

        await Promise.all(promises);

        // log out and close connection
        await imapClient.logout();
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
            await processMessageNumbers(messageNumbers, folder.id, imapFolderStatus);
        } else {
            logger.info(`FolderId ${accountFolder.id} has 0 messages to sync`);
        }
    } else {
        logger.info(`Message count ${imapFolderStatus.messages} - uidNext ${imapFolderStatus.uidNext}`);
        if (folder.status_uidvalidity != imapFolderStatus.uidValidity) {
            logger.warn(`FolderId ${accountFolder.id} uidvalidity changed`);
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
            await processMessageNumbers(messageNumbers, folder.id, imapFolderStatus);
        }
    }
}

async function processMessageNumbers(messageNumbers: MessageNumber[], folderId: number, imapFolderStatus: ImapFolderStatus): Promise<void> {
    if (messageNumbers.length > 0) {
        const jobId = await createJob(JSON.stringify({ folderId, messageNumbers }));
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

async function buildMessageNumbers(imapClient: ImapFlow, folderName: string, lastUpdatedMsgNo: number, imapFolderLastUid: number): Promise<MessageNumber[]> {
    let messageNumbers = await getMessageNumbers(imapClient, folderName, lastUpdatedMsgNo, imapFolderLastUid);
    messageNumbers = _.sortBy(messageNumbers, ['uid']);
    return messageNumbers.slice(0, BATCH_SIZE);
}