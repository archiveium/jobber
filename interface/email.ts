export interface ImapEmail {
    uid: number;
    internalDate: Date;
    subject: string;
    source: string;
    hasAttachments: boolean;
}

export interface DatabaseEmail {
    userId: number;
    folderId: number;
    messageNumber: number;
    udate: number;
    hasAttachments: boolean;
    imported: boolean;
    importFailReason?: string;
}