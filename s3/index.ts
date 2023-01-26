import { S3Client } from "@aws-sdk/client-s3";
import config from 'config';

// TODO Remove 'any' usage
const s3Config = config.get('s3') as any;

const s3Client = new S3Client(s3Config);

export { s3Client };