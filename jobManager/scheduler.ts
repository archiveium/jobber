import { getJob, acquireJobLock, getFolder, deleteJob, parseDefaultJobPayload, getAccount, updateFolder, createJob } from '../jobManager/index';
import { getMessageNumbers, getFolderStatusByName } from '../imap/index';
import _ from 'lodash';
import { buildClient } from '../imap/builder';
import { ImapFlow } from 'imapflow';
import { ImapFolderStatus, MessageNumber } from '../interface/imap';

const BATCH_SIZE: number = 100;

export async function schedule() {
    console.log('Running schedule email job');
    const job = await getJob('default');
    if (job.length > 0) {
        const jobData = job[0];
        await acquireJobLock(jobData.id);

        const payloadData = parseDefaultJobPayload(jobData.payload);

        // TODO If account not found, log warning & delete the job
        const account = await getAccount(payloadData.userId, payloadData.accountId);

        // TODO If authentication fails, disable syncing & send notification to user
        const imapClient = await buildClient(account.username, account.password);

        const folder = await getFolder(payloadData.folder.id);
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
                console.debug('Folder has 0 messages to sync');
            }
        } else {
            if (folder.status_uidvalidity != imapFolderStatus.uidValidity) {
                console.log('uidvalidity changed');
            } else if (imapFolderStatus.messages == 0) {
                console.log('Folder has 0 messages to sync');
            } else if (folder.last_updated_msgno == imapFolderLastUid) {
                console.log('Found no new messages to sync');
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

        // log out and close connection
        await imapClient.logout();

        await deleteJob(jobData.id);
    } else {
        console.log('Nothing to process');
    }
}

async function processMessageNumbers(messageNumbers: MessageNumber[], folderId: number, imapFolderStatus: ImapFolderStatus): Promise<void> {
    if (messageNumbers.length > 0) {
        const jobCreated = await createJob(JSON.stringify({ folderId, messageNumbers }));
        if (jobCreated) {
            const updateResult = await updateFolder(
                folderId,
                imapFolderStatus.uidValidity,
                messageNumbers[messageNumbers.length - 1].uid,
                imapFolderStatus.messages,
            );
            if (updateResult.count != 1) {
                console.error(`Updated inadequate no. of rows: ${updateResult.count}`);
            }
        } else {
            console.error('Failed to create job');
        }
    }    
}

async function buildMessageNumbers(imapClient: ImapFlow, folderName: string, lastUpdatedMsgNo: number, imapFolderLastUid: number): Promise<MessageNumber[]> {
    let messageNumbers = await getMessageNumbers(imapClient, folderName, lastUpdatedMsgNo, imapFolderLastUid);
    messageNumbers = _.sortBy(messageNumbers, ['uid']);
    return messageNumbers.slice(0, BATCH_SIZE);
}