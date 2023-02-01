import { getJob, getFolder, parseEmailJobPayload, deleteJob, acquireJobLock, getAccount } from '../jobManager/index';
import { getEmails } from '../imap/index';
import _ from 'lodash';
import { buildClient } from '../imap/builder';
import { ImapEmail } from '../interface/email';
import { insertEmail } from '../database/email';
import { insertS3Object } from '../s3/email';
import { logger } from '../utils/logger';

export async function process() {    
    logger.info('Running fetch email job');

    const job = await getJob('email');
    if (job.length > 0) {
        const jobData = job[0];
        await acquireJobLock(jobData.id);

        const payloadData = parseEmailJobPayload(jobData.payload);
        const folder = await getFolder(payloadData.folderId);
        
        // TODO If account not found, log warning & delete the job
        const account = await getAccount(folder.user_id, folder.account_id);

        // TODO If authentication fails, disable syncing & send notification to user
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
            emails.map(async (email: ImapEmail) => {
                const emailAddedToDatabase = await insertEmail({
                    messageNumber: email.uid,
                    userId: folder.user_id,
                    folderId: folder.id,
                    imported: true,
                    hasAttachments: email.hasAttachments,
                    udate: 1234     // TODO Use correct udate
                });
                if (emailAddedToDatabase) {
                    // TODO Rollback database save if S3 insert fails
                    await insertS3Object(
                        `${folder.user_id}\/${folder.id}\/${email.uid}.eml`,
                        email.source,
                    );
                }
            });

            const jobDeleted = await deleteJob(jobData.id);
            if (jobDeleted) {
                logger.info(`Deleted job: ${jobData.id}`);
            } else {
                logger.error(`Unable to delete job: ${jobData.id}`);
            }

            logger.info('Finished processing job id ' + jobData.id);
        }
    } else {
        logger.info('Nothing to process');
    }
}