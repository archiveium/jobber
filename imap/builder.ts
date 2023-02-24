import ImapFlow from 'imapflow';
import {
    IMAPAuthenticationFailed,
    IMAPGenericException,
    IMAPTooManyRequests,
    IMAPUserAuthenticatedNotConnected,
} from '../exception/imap';
import { logger } from '../utils/logger';

export async function buildClient(username: string, password: string, host: string): Promise<ImapFlow.ImapFlow> {
    const client = new ImapFlow.ImapFlow({
        emitLogs: true,
        logger: false,
        host,
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
        } else if (error.response && error.response.includes('User is authenticated but not connected')) {
            throw new IMAPUserAuthenticatedNotConnected(error.response);
        } else if (error.authenticationFailed) {
            throw new IMAPAuthenticationFailed(error.response);
        } else if (error instanceof Error) {
            throw new IMAPGenericException(error.message);
        }
        throw error;
    }

    client.on('error', (error) => {
        logger.error(JSON.stringify(error));
    });

    return client;
}