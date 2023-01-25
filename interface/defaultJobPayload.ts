export interface DefaultJobPayload {
    userId: number
    accountId: number
    folder: {
        id: number
    }
    delay: {
        date: string
        timezone_type: number
        timezone: string
    }
}