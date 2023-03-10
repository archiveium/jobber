import ImapFlow, { ListResponse } from 'imapflow';
import { Folder } from '../interface/folder';
import { ImapEmail } from '../interface/email';
import { ImapFolderStatus, MessageNumber } from '../interface/imap';
import _ from 'lodash';
import { logger } from '../utils/logger';
import { IMAPGenericException } from '../exception/imap';

export async function getMessageNumbers(
    client: ImapFlow.ImapFlow,
    folderName: string,
    startSeq: number,
    endSeq: number
): Promise<MessageNumber[]> {
    let messageNumbers: MessageNumber[] = [];

    let lock = await client.getMailboxLock(folderName);
    try {
        // @ts-ignore since type definations have the parameters wrong
        const messages = client.fetch(`${startSeq}:${endSeq}`, { size: true }, { uid: true });
        for await (let message of messages) {
            messageNumbers.push({
                uid: message.uid,
                size: message.size,
            });
        }
    } catch (error) {
        if (error instanceof Error) {
            throw new IMAPGenericException(error.message);
        }
    } finally {
        lock.release();
    }

    return messageNumbers;
}

export async function getEmails(
    client: ImapFlow.ImapFlow,
    folder: Folder,
    startSeq: number,
    endSeq: number
): Promise<ImapEmail[]> {
    const imapEmails: ImapEmail[] = [];

    let lock = await client.getMailboxLock(folder.name);
    try {
        const messages = client.fetch(
            `${startSeq}:${endSeq}`,
            { envelope: true, source: true, bodyStructure: true, internalDate: true },
            // @ts-ignore since type definations have the parameters wrong
            { uid: true },
        );

        for await (let message of messages) {
            let hasAttachments = false;
            if (message.bodyStructure.childNodes?.length) {
                hasAttachments = _.find(message.bodyStructure.childNodes, { disposition: 'attachment' }) !== undefined;
            }

            imapEmails.push({
                uid: message.uid,
                internalDate: message.internalDate,
                subject: message.envelope.subject,
                source: message.source.toString(),
                hasAttachments,
            });
        }
    } finally {
        lock.release();
    }

    return imapEmails;
}

export async function getFolderStatusByName(client: ImapFlow.ImapFlow, name: string): Promise<ImapFolderStatus> {
    let status: ImapFolderStatus;

    let lock = await client.getMailboxLock(name);
    try {
        // @ts-ignore since type definations have the parameters wrong
        status = await client.status(name, { messages: true, uidNext: true, uidValidity: true });
    } catch (e) {
        logger.error(`[getFolderStatusByName] ${JSON.stringify(e)}`);
        throw e;
    } finally {
        lock.release();
    }

    return {
        path: status.path,
        messages: status.messages,
        uidNext: status.uidNext,
        uidValidity: status.uidValidity,
    };
}

export async function getAllIMAPFolders(client: ImapFlow.ImapFlow): Promise<ListResponse[]> {
    const options = {
        statusQuery: {
            uidValidity: true,
            messages: true,
        }
    };

    // @ts-ignore since type definations have the parameters wrong
    return client.list(options);
}