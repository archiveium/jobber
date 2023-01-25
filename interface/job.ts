export interface Job {
    id: number
    queue: string
    payload: string
    attempts: number
    reserved_at: EpochTimeStamp
    available_at: EpochTimeStamp
    created_at: EpochTimeStamp
}

export interface PayloadMessageNumber {
    uid: number;
    size: number;
}

export interface EmailJobPayload {
    folderId: number;
    messageNumbers: Array<PayloadMessageNumber>;
}