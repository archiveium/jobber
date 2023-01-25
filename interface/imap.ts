export interface ImapFolderStatus {
    path: string;
    messages: number;
    uidNext: number;
    uidValidity: number;
}

export interface MessageNumber {
    uid: number;
    size: number;
}