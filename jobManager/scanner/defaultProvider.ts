import { ListResponse } from "imapflow";
import _ from "lodash";
import { getFoldersByUserAndAccount } from "../../database/folder";
import { Folder } from "../../interface/folder";

export class DefaultProvider {
    public async getAllSyncedLocalFolders(userId: number, accountId: number): Promise<Folder[]> {
        return getFoldersByUserAndAccount(userId, accountId, false);
    }

    public hasFolderNameChanged(savedFolderName: string, remoteFolderName: string): boolean {
        return savedFolderName.toLowerCase() !== remoteFolderName.toLowerCase();
    }

    public getSyncedLocalFolder(localFolders: Folder[], remoteFolder: ListResponse): Folder | undefined {
        // @ts-ignore since type definations have the parameters wrong
        if (remoteFolder.status) {
            // @ts-ignore since type definations have the parameters wrong
            return _.find(localFolders, function(o) {
                // @ts-ignore since type definations have the parameters wrong
                return o.status_uidvalidity === Number(remoteFolder.status.uidValidity);
            });
        }
    }
}