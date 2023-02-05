import {
    DeleteObjectCommand,
    DeleteObjectCommandInput,
    ListObjectsV2Command,
    ListObjectsV2CommandInput,
    PutObjectCommand,
    PutObjectCommandInput,
    PutObjectCommandOutput
} from "@aws-sdk/client-s3";
import { logger } from "../utils/logger";
import { s3Client } from "./index";

const BUCKET = 'emails';

export async function insertS3Object(key: string, body: string): Promise<PutObjectCommandOutput> {
    const params: PutObjectCommandInput = {
        Bucket: BUCKET,
        Key: key,
        Body: body,
    };
    try {
        const results = await s3Client.send(new PutObjectCommand(params));
        return results;
    } catch (err) {
        logger.error(JSON.stringify(err));
        throw err;
    }
}

export async function deleteS3Objects(prefix: string): Promise<void> {
    const listObjectParams: ListObjectsV2CommandInput = {
        Bucket: BUCKET,
        Prefix: prefix,
        MaxKeys: 100,
    };

    let isTruncated = true;
    try {
        while (isTruncated) {
            const results = await s3Client.send(new ListObjectsV2Command(listObjectParams));
            const s3Objects = results.Contents;
            const promises = s3Objects?.map(async (s3Object) => {
                if (s3Object.Key) {
                    return deleteS3Object(s3Object.Key);
                }
            });

            if (promises) {
                await Promise.all(promises);
            }

            isTruncated = results.IsTruncated ?? false;
            if (isTruncated) {
                listObjectParams.ContinuationToken = results.NextContinuationToken;
            }
        }
    } catch (err) {
        logger.error(JSON.stringify(err));
        throw err;
    }
}

export async function deleteS3Object(key: string): Promise<void> {
    const params: DeleteObjectCommandInput = {
        Bucket: BUCKET,
        Key: key,
    };

    try {
        await s3Client.send(new DeleteObjectCommand(params));
    } catch (error) {
        logger.error(JSON.stringify(error));
        throw error;   
    }
}