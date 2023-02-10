import { sql } from './database/index';
import { process } from './jobManager/processor';
import { schedule } from './jobManager/scheduler';
import { CronJob } from 'cron';
import { deletor } from './jobManager/deletor';
import { scanner } from './jobManager/scanner';

const processorJob = new CronJob(
    '* * * * *',
    process,
    async function () {
        await sql.end();
    },
    false,
    'America/Toronto'
);
const schedulerJob = new CronJob(
    '* * * * *',
    schedule,
    async function () {
        await sql.end();
    },
    false,
    'America/Toronto'
);
const deletorJob = new CronJob(
    '* * * * *',
    deletor,
    async function () {
        await sql.end();
    },
    false,
    'America/Toronto'
);
const scannerJob = new CronJob(
    '* * * * *',
    scanner,
    async function () {
        await sql.end();
    },
    false,
    'America/Toronto'
);

async function main(): Promise<void> {
    processorJob.start();
    // process();

    schedulerJob.start();
    // schedule();

    deletorJob.start();
    // deletor();

    scannerJob.start();
    // scanner();
}

main();