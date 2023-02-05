import { sql } from '../database/index';
import { DatabaseEmail } from '../interface/email';

export async function insertEmail(email: DatabaseEmail): Promise<boolean> {
    const unixTimestamp = Math.floor(Date.now() / 1000);
    const importFailReason = email.importFailReason ? email.importFailReason : null;
    const result = await sql`INSERT INTO emails 
    (user_id, folder_id, message_number, udate, has_attachments, imported, import_fail_reason, created_at, updated_at)
    VALUES (
        ${email.userId}, 
        ${email.folderId}, 
        ${email.messageNumber}, 
        ${email.udate}, 
        ${email.hasAttachments}, 
        ${email.imported}, 
        ${importFailReason}, 
        ${unixTimestamp}, 
        ${unixTimestamp}
    );`;
    return result.count === 1;
}