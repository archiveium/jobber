import ImapFlow from 'imapflow';
import { IMAPAuthenticationFailed, IMAPTooManyRequests } from '../exception/imap';
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
        if (error.response && error.response.includes('Too many simultaneous connections')) {
            throw new IMAPTooManyRequests(error.response);
        }
        if (error.authenticationFailed) {
            throw new IMAPAuthenticationFailed(error.response);
        }
        logger.error(JSON.stringify(error));
        throw error;
    }

    return client;
}