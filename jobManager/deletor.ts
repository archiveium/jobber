import { logger } from '../utils/logger';
import { deleteAccount, getAllDeletedAccounts } from '../database/account';
import { getDeletedFoldersByUserAndAccount } from '../database/folder';
import { deleteS3Objects } from '../s3/email';

export async function deletor(): Promise<void> {
    logger.info('Started running deletor');

    const allDeletedAccounts = await getAllDeletedAccounts();
    allDeletedAccounts.forEach(async (deletedAccount) => {
        logger.info(`Deleting Account ID ${deletedAccount.id}`);
        const folders = await getDeletedFoldersByUserAndAccount(deletedAccount.user_id, deletedAccount.id);

        logger.info('Started deleting S3 objects');
        const promises = folders.map((folder) => {
            logger.info(`Deleting S3 objects in folder ${folder.id}`);
            return deleteS3Objects(`${folder.user_id}/${folder.id}`);
        });
        await Promise.all(promises);
        logger.info('Finished deleting S3 objects');

        logger.info('Started deleting account, folder & emails');
        await deleteAccount(deletedAccount.id);
        logger.info('Finished deleting account, folder & emails');
    });
}