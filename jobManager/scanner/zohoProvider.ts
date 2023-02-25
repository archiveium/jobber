import { ListResponse } from "imapflow";
import _ from "lodash";
import { getAllFoldersByUserAndAccount } from "../../database/folder";
import { Folder } from "../../interface/folder";
import { DefaultProvider } from "./defaultProvider";

export class ZohoProvider extends DefaultProvider {
    public async getAllSyncedLocalFolders(userId: number, accountId: number): Promise<Folder[]> {
        return getAllFoldersByUserAndAccount(userId, accountId);
    }

    public getSyncedLocalFolder(localFolders: Folder[], remoteFolder: ListResponse): Folder | undefined {
        // @ts-ignore since type definations have the parameters wrong
        if (remoteFolder.status) {
            return _.find(localFolders, function(o) {
                return o.name === remoteFolder.path;
            });
        }
    }
}