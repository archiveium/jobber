import ImapFlow from 'imapflow';

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

    // Wait until client connects and authorizes
    await client.connect();

    return client;
}