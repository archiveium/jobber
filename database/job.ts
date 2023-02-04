import { sql } from '../database/index';
import { EmailJobPayload, Job } from '../interface/job';
import { DefaultJobPayload } from '../interface/defaultJobPayload';
const phpUnserialize = require('phpunserialize');

export function getJob(queue: string): Promise<Job[]> {
    return sql<Job[]>`SELECT * FROM jobs 
    WHERE queue = ${queue} AND reserved_at IS NULL
    ORDER BY id 
    ASC LIMIT 1`;
}

export function acquireJobLock(jobId: number) {
    const unixTimestamp = Math.floor(Date.now() / 1000);
    return sql`UPDATE jobs SET reserved_at = ${unixTimestamp} WHERE id = ${jobId}`;
}

export function releaseJobLock(jobId: number) {
    return sql`UPDATE jobs 
    SET reserved_at = null 
    WHERE id = ${jobId}`;
}

export async function deleteJob(jobId: number): Promise<boolean> {
    const result = await sql`DELETE FROM jobs WHERE id = ${jobId};`;
    return result.count === 1;
}

export async function createJob(payload: string): Promise<number> {
    const unixTimestamp = Math.floor(Date.now() / 1000);
    const result = await sql`INSERT INTO jobs (queue, payload, attempts, reserved_at, available_at, created_at)
    VALUES ('email', ${payload}, 1, null, ${unixTimestamp}, ${unixTimestamp})
    RETURNING id;`;
    return result.count > 0 ? result[0].id : 0;
}

export function parseEmailJobPayload(payload: string): EmailJobPayload {
    const { accountId, folderId, messageNumbers } = JSON.parse(payload);
    return {
        accountId,
        folderId,
        messageNumbers
    };
}

export function parseDefaultJobPayload(payload: string): DefaultJobPayload {
    return <DefaultJobPayload>phpUnserialize(
        JSON.parse(payload).data.command
    );
}