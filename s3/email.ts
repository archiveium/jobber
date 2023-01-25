import { PutObjectCommand, PutObjectCommandInput, PutObjectCommandOutput } from "@aws-sdk/client-s3";
import { s3Client } from "./index";

export async function insertS3Object(key: string, body: string): Promise<PutObjectCommandOutput> {
    const params: PutObjectCommandInput = {
        Bucket: "emails",
        Key: key,
        Body: body,
    };
    try {
        const results = await s3Client.send(new PutObjectCommand(params));
        console.log(`Successfully created ${params.Key} and uploaded it to ${params.Bucket}/${params.Key}`);
        return results;
    } catch (err) {
        console.log("Error", err);
        throw err;
    }
}