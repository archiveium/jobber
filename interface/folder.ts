export interface Folder {
    id: number
    user_id: number
    account_id: number
    name: string
    status_uidvalidity: number
    status_messages: number
    last_updated_msgno: number
    deleted: boolean
    deleted_remote: boolean
    created_at: EpochTimeStamp
    updated_at: EpochTimeStamp
}