import { PutObjectCommand, PutObjectCommandInput, PutObjectCommandOutput } from "@aws-sdk/client-s3";
import { logger } from "../utils/logger";
import { s3Client } from "./index";

export async function insertS3Object(key: string, body: string): Promise<PutObjectCommandOutput> {
    const params: PutObjectCommandInput = {
        Bucket: "emails",
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