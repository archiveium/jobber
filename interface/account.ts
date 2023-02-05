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
}

export interface SyncingAccount {
    id: number;
    username: string;
    password: string;
    user_id: number;
    provider_id: number;
}

export interface DeletedAccount {
    id: number;
    user_id: number;
}