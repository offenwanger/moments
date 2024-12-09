import { WebsocketController } from './pages/controllers/websocket_controller.js';
import { EditorPage } from './pages/editor_page.js';
import { ListPage } from './pages/list_page.js';
import { WelcomePage } from './pages/welcome_page.js';
import { HandleStorage } from './utils/handle_storage.js';
import { UrlUtil } from './utils/url_util.js';
import { WorkspaceManager } from './workspace_manager.js';

export async function main() {
    let mWebsocketController = new WebsocketController();

    async function updatePage() {
        document.querySelector('#content').replaceChildren();
        let folder = await HandleStorage.getItem('folder');
        let missingPermissions = folder ? await folder.queryPermission({ mode: 'readwrite' }) !== 'granted' : false;
        let story = UrlUtil.getParam("story");
        let view = UrlUtil.getParam("view") == 'true';
        let remote = UrlUtil.getParam("remote") == 'true';
        let list = UrlUtil.getParam("list") == 'true';

        if (story && remote) {
            if (view) {
                await showViewPage();
            } else {
                await showEditorPage()
            }
        } else if (!folder) {
            await showWelcomePage(false);
        } else if (folder && missingPermissions) {
            await showWelcomePage(true);
        } else if (folder && !missingPermissions && story) {
            let workspaceManager = new WorkspaceManager(folder);
            await showEditorPage(workspaceManager)
        } else if (folder && !missingPermissions && list) {
            let workspaceManager = new WorkspaceManager(folder);
            await showListPage(workspaceManager);
        } else if (folder && !missingPermissions && !list) {
            await showWelcomePage(true);
        } else {
            console.error("Unknown state! folder: " + folder + " - missingPermissions: " + missingPermissions + " - story: " + story + " - view: " + view + " - remote: " + remote + " - list: " + list)
        }
    }

    async function showWelcomePage(withLastFolder) {
        let page = new WelcomePage(document.querySelector('#content'), withLastFolder, mWebsocketController);
        page.onFolderSelected(async (folder) => {
            if (await folder.requestPermission({ mode: 'readwrite' }) === 'granted') {
                await HandleStorage.setItem('folder', folder);
            }
            UrlUtil.setParam("list", 'true');
            await updatePage();
        });

        page.onLastFolder(async () => {
            let folder = await HandleStorage.getItem('folder');
            if (await folder.requestPermission({ mode: 'readwrite' }) !== 'granted') {
                await HandleStorage.removeItem('folder');
            }
            UrlUtil.setParam("list", 'true');
            await updatePage();
        });

        page.onOpenRemoteStory(async (storyId) => {
            UrlUtil.setParam("story", storyId);
            UrlUtil.setParam("remote", 'true');
            await updatePage();
        });
    }

    async function showListPage(workspaceManger) {
        let page = new ListPage(document.querySelector('#content'));
        page.setEditCallback(async (storyId) => {
            UrlUtil.setParam("story", storyId);
            await updatePage();
        });

        await page.show(workspaceManger)
    }

    async function showEditorPage(workspaceManger) {
        let page = new EditorPage(document.querySelector('#content'), mWebsocketController);
        // handel all the needed async stuff
        await page.show(workspaceManger);
    }

    await updatePage();
};