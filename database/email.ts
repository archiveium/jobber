import { DateTime } from 'luxon';
import { sql } from '../database/index';
import { DatabaseEmail } from '../interface/email';

export async function insertEmail(email: DatabaseEmail): Promise<boolean> {
    const dateTime = DateTime.now().toString();
    const importFailReason = email.importFailReason ? email.importFailReason : null;
    const result = await sql`INSERT INTO emails 
    (user_id, folder_id, message_number, udate, has_attachments, imported, import_fail_reason, created_at)
    VALUES (
        ${email.userId}, 
        ${email.folderId}, 
        ${email.messageNumber}, 
        ${email.udate}, 
        ${email.hasAttachments}, 
        ${email.imported}, 
        ${importFailReason}, 
        ${dateTime}
    );`;
    return result.count === 1;
}