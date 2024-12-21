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

        if (UrlUtil.getParam("story") && UrlUtil.getParam("remote") == 'true') {
            // attempt to connect to the remote story
            await showEditorPage()
            return;
        }

        if (!folder) {
            await showWelcomePage(false);
        } else {
            if (missingPermissions) {
                await showWelcomePage(true);
            } else if (UrlUtil.getParam("story")) {
                // we have a folder, permissions, and a story id, show it. 
                let workspaceManager = new WorkspaceManager(folder);
                await showEditorPage(workspaceManager)
            } else if (UrlUtil.getParam("list") == 'true') {
                // no story, but we want to show the list!
                let workspaceManager = new WorkspaceManager(folder);
                await showListPage(workspaceManager);
            } else {
                // Default to the welcome page.
                await showWelcomePage(true);
            }
        }
    }

    async function showWelcomePage(withLastFolder) {
        let page = new WelcomePage(document.querySelector('#content'), withLastFolder, mWebsocketController);
        page.onFolderSelected(async (folder) => {
            if (await folder.requestPermission({ mode: 'readwrite' }) === 'granted') {
                await HandleStorage.setItem('folder', folder);
            }
            UrlUtil.navigate({ list: 'true' });
        });

        page.onLastFolder(async () => {
            let folder = await HandleStorage.getItem('folder');
            if (await folder.requestPermission({ mode: 'readwrite' }) !== 'granted') {
                await HandleStorage.removeItem('folder');
            }
            UrlUtil.navigate({ list: 'true' });
        });

        page.onOpenRemoteStory(async (storyId) => {
            UrlUtil.navigate({ remote: 'true', story: storyId });
        });
    }

    async function showListPage(workspaceManger) {
        let page = new ListPage(document.querySelector('#content'));
        page.setEditCallback(async (storyId) => {
            UrlUtil.navigate({ story: storyId });
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