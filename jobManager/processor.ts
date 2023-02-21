import { getEmails } from '../imap/index';
import _ from 'lodash';
import { buildClient } from '../imap/builder';
import { ImapEmail } from '../interface/email';
import { insertEmail } from '../database/email';
import { insertS3Object } from '../s3/email';
import { logger } from '../utils/logger';
import { FolderDeleted, FolderDeletedOnRemote, FolderNotFound } from '../exception/folder';
import { AccountDeleted, AccountSyncingPaused } from '../exception/account';
import { IMAPAuthenticationFailed, IMAPTooManyRequests } from '../exception/imap';
import { getAccount, updateAccountSyncing } from '../database/account';
import { acquireJobLock, deleteJob, getJob, parseEmailJobPayload, releaseJobLock } from '../database/job';
import { getFolder } from '../database/folder';
import { Folder } from '../interface/folder';
import { sql } from '../database';

// TODO Add a progress bar to show how many emails have been imported for each account
export async function process(): Promise<void> {
    logger.info('Started running fetch email job');

    const job = await getJob('email');
    if (job.length > 0) {
        const jobData = job[0];
        // lock job
        await acquireJobLock(jobData.id);

        const payloadData = parseEmailJobPayload(jobData.payload);

        try {
            const folder = await getFolder(payloadData.folderId);
            const account = await getAccount(folder.user_id, folder.account_id);
            const imapClient = await buildClient(account.username, account.password);

            // TODO Pass startSeq and endSeq from scheduler
            const startSeq = _.first(payloadData.messageNumbers)?.uid;
            const endSeq = _.last(payloadData.messageNumbers)?.uid;

            if (startSeq === undefined || endSeq === undefined) {
                // TODO move job to failed_table
                logger.error('Move job to failed_table');

                // TODO release database lock
                logger.error('TODO Release database lock');
            } else {
                logger.info(`Processing job ${JSON.stringify(jobData)}`);
                const emails = await getEmails(imapClient, folder, startSeq, endSeq);

                const promises = emails.map((email: ImapEmail) => {
                    return insertToDatabaseAndS3(email, folder);
                });
                await Promise.all(promises);

                await deleteInvalidJob(jobData.id);
            }
        } catch (error) {
            if (
                error instanceof FolderDeleted ||
                error instanceof AccountDeleted ||
                error instanceof FolderDeletedOnRemote ||
                error instanceof FolderNotFound
            ) {
                logger.warn(`Deleting job since account/folder was deleted locally or on remote`, {
                    jobId: jobData.id,
                    folderId: payloadData.folderId,
                    accountId: payloadData.accountId
                });
                await deleteInvalidJob(jobData.id);
            } else if (error instanceof IMAPTooManyRequests) {
                logger.warn(`Too many requests for Job ID: ${jobData.id} - Error: ${error.message}`);
                // release job
                await releaseJobLock(jobData.id);
            } else if (error instanceof IMAPAuthenticationFailed) {
                logger.error(`Authentication failed for Account ID ${payloadData.accountId}. Disabling syncing`);
                await updateAccountSyncing(payloadData.accountId, false);
                // release job
                await releaseJobLock(jobData.id);
                // TODO send notification to user
            } else if (error instanceof AccountSyncingPaused) {
                // TODO Rethink handling of account account when syncing is paused
                // Avoid db read and write unnecessarily, maybe a separate table
                // with account and folder id as separate columns
                logger.warn(`Skipping job: ${error.message}`);
                // release job
                await releaseJobLock(jobData.id);
            } else {
                logger.error(JSON.stringify(error));
                throw error;
            }
        }

        logger.info('Finished processing job id ' + jobData.id);
    } else {
        logger.info('Nothing to process');
    }
}

async function insertToDatabaseAndS3(email: ImapEmail, folder: Folder): Promise<void> {
    await sql.begin(async sql => {
        await insertEmail({
            messageNumber: email.uid,
            userId: folder.user_id,
            folderId: folder.id,
            imported: true,
            hasAttachments: email.hasAttachments,
            udate: email.internalDate
        }, sql);
        await insertS3Object(
            `${folder.user_id}/${folder.id}/${email.uid}.eml`,
            email.source,
        );
    });
}

async function deleteInvalidJob(jobId: number): Promise<void> {
    const jobDeleted = await deleteJob(jobId);
    if (jobDeleted) {
        logger.info(`Deleted job: ${jobId}`);
    } else {
        logger.error(`Unable to delete job: ${jobId}`);
    }
}