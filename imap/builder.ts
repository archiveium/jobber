import ImapFlow from 'imapflow';
import { IMAPAuthenticationFailed } from '../exception/imap';
import { logger } from '../utils/logger';

export async function buildClient(username: string, password: string): Promise<ImapFlow.ImapFlow> {
    const client = new ImapFlow.ImapFlow({
        emitLogs: true,
        logger: false,
        host: 'imap.gmail.com',
        port: 993,
        secure: true,
        auth: {
            user: username,
            pass: password
        }
    });

    try {
        // Wait until client connects and authorizes
        await client.connect();
    } catch (error: any) {
        logger.error(JSON.stringify(error));
        if (error.authenticationFailed) {
            throw new IMAPAuthenticationFailed(error.message);
        }
        throw error;
    }

    return client;
}