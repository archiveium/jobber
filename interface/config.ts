export interface DatabaseConfig {
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
}

export interface S3Config {
    region: string;
    endpoint: string;
    credentials: {
        accessKeyId: string;
        secretAccessKey: string;
    };
    forcePathStyle: boolean;
}