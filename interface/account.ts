export interface Account {
    id: number
    name: string
    username: string
    password: string
    user_id: number
    provider_id: number
    syncing: boolean
    deleted: boolean
    searchable: boolean
    created_at: EpochTimeStamp
    updated_at: EpochTimeStamp
    provider_host: string;
}

export interface SyncingAccount {
    id: number;
    username: string;
    password: string;
    user_id: number;
    provider_name: string;
    provider_host: string;
}

export interface DeletedAccount {
    id: number;
    user_id: number;
}