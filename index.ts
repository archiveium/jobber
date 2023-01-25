import { sql } from './database/index';
import { process } from './jobManager/processor';
import { schedule } from './jobManager/scheduler';
import { CronJob } from 'cron';

async function main() {
    const processorJob = new CronJob(
        '* * * * *',
        process,
        async function () {
            await sql.end();
        },
        false,
        'America/Toronto'
    );
    processorJob.start();
    // process();

    const schedulerJob = new CronJob(
        '* * * * *',
        schedule,
        async function () {
            await sql.end();
        },
        false,
        'America/Toronto'
    );
    schedulerJob.start();
    // schedule();
}

main();