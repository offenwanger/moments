import { EventManager } from './event_manager.js';
import { EditorPage } from './pages/editor_page.js';
import { ListPage } from './pages/list_page.js';
import { WelcomePage } from './pages/welcome_page.js';
import { HandleStorage } from './utils/handle_storage.js';
import { WorkspaceManager } from './workspace_manager.js';
import { WebsocketController } from './pages/controllers/websocket_controller.js';

export async function main() {
    let mEventManager = new EventManager();
    let mWebsocketController = new WebsocketController();

    async function updatePage() {
        d3.select('#content').selectAll("*").remove();
        let folder = await HandleStorage.getItem('folder');
        let missingPermissions = folder ? await folder.queryPermission({ mode: 'readwrite' }) !== 'granted' : false;
        let story = new URLSearchParams(window.location.search).get("story");
        let view = new URLSearchParams(window.location.search).get("view") == 'true';
        let remote = new URLSearchParams(window.location.search).get("remote") == 'true';
        let list = new URLSearchParams(window.location.search).get("list") == 'true';

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
        let page = new WelcomePage(d3.select('#content'), withLastFolder, mWebsocketController);
        page.onFolderSelected(async (folder) => {
            if (await folder.requestPermission({ mode: 'readwrite' }) === 'granted') {
                await HandleStorage.setItem('folder', folder);
            }
            let params = new URLSearchParams(window.location.search)
            params.set("list", 'true')
            window.location.search = params.toString();
            await updatePage();
        });

        page.onLastFolder(async () => {
            let folder = await HandleStorage.getItem('folder');
            if (await folder.requestPermission({ mode: 'readwrite' }) !== 'granted') {
                await HandleStorage.removeItem('folder');
            }
            let params = new URLSearchParams(window.location.search)
            params.set("list", 'true')
            window.location.search = params.toString();
            await updatePage();
        });

        page.onOpenRemoteStory(async (storyId) => {
            let params = new URLSearchParams(window.location.search)
            params.set("story", storyId)
            params.set("remote", 'true')
            window.location.search = params.toString();
            await updatePage();
        });
    }

    async function showListPage(workspaceManger) {
        let page = new ListPage(d3.select('#content'));
        page.setEditCallback(async (storyId) => {
            let params = new URLSearchParams(window.location.search)
            params.set("story", storyId)
            window.location.search = params.toString();
            await updatePage();
        });

        await page.show(workspaceManger)
    }

    async function showEditorPage(workspaceManger) {
        let page = new EditorPage(d3.select('#content'), mWebsocketController);
        await mEventManager.setListener(page);
        // handel all the needed async stuff
        await page.show(workspaceManger);
    }

    await updatePage();
};