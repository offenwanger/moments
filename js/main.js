import { EventManager } from './event_manager.js';
import { EditorPage } from './pages/editor_page.js';
import { ViewerPage } from './pages/viewer_page.js';
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
        let story = new URLSearchParams(window.location.search).get("story")
        if (story && new URLSearchParams(window.location.search).get("view") == 'true') {
            await showViewPage();
        } else if (folder) {
            if (await folder.queryPermission({ mode: 'readwrite' }) !== 'granted') {
                await showWelcomePage(true);
            } else {
                // folder all set
                let workspaceManager = new WorkspaceManager(folder);
                if (story) {
                    await showEditorPage(workspaceManager)
                } else if (new URLSearchParams(window.location.search).get("list") == 'true') {
                    await showListPage(workspaceManager);
                } else {
                    await showWelcomePage(true);
                }
            }
        } else { await showWelcomePage(false); }
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

        page.onViewStory(async (storyId) => {
            let params = new URLSearchParams(window.location.search)
            params.set("story", storyId)
            params.set("view", 'true')
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

    async function showViewPage() {
        let page = new ViewerPage(d3.select('#content'), mWebsocketController);
        await mEventManager.setListener(page);
        // handel all the needed async stuff
        await page.show();
    }

    await updatePage();
};