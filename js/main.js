import { EventManager } from './event_manager.js';
import { EditorPage } from './pages/editor_page.js';
import { ListPage } from './pages/list_page.js';
import { ViewerPage } from './pages/viewer_page.js';
import { WelcomePage } from './pages/welcome_page.js';
import { HandleStorage } from './utils/handle_storage.js';
import { WorkspaceManager } from './workspace_manager.js';

export async function main() {
    let mEventManager = new EventManager();

    async function updatePage() {
        d3.select('#content').selectAll("*").remove();
        let folder = await HandleStorage.getItem('folder');
        if (folder) {
            if (await folder.queryPermission({ mode: 'readwrite' }) !== 'granted') {
                await showWelcomePage(true);
            } else {
                // folder all set
                let workspaceManager = new WorkspaceManager(folder);
                let story = new URLSearchParams(window.location.search).get("story")
                if (story) {
                    let isEditor = new URLSearchParams(window.location.search).get("editor");
                    if (isEditor == 'true') {
                        await showEditorPage(workspaceManager)
                    } else {
                        await showViewerPage(workspaceManager)
                    }
                } else if (new URLSearchParams(window.location.search).get("list") == 'true') {
                    await showListPage(workspaceManager);
                } else {
                    await showWelcomePage(true);
                }
            }
        } else { await showWelcomePage(false); }
    }

    async function showWelcomePage(withLastFolder) {
        let page = new WelcomePage(d3.select('#content'), withLastFolder);
        page.setFolderSelectedCallback(async (folder) => {
            if (await folder.requestPermission({ mode: 'readwrite' }) === 'granted') {
                await HandleStorage.setItem('folder', folder);
            }
            let params = new URLSearchParams(window.location.search)
            params.set("list", 'true')
            window.location.search = params.toString();
            await updatePage();
        });

        page.setLastFolderCallback(async () => {
            let folder = await HandleStorage.getItem('folder');
            if (await folder.requestPermission({ mode: 'readwrite' }) !== 'granted') {
                await HandleStorage.removeItem('folder');
            }
            let params = new URLSearchParams(window.location.search)
            params.set("list", 'true')
            window.location.search = params.toString();
            await updatePage();
        });
    }

    async function showListPage(workspaceManger) {
        let page = new ListPage(d3.select('#content'));
        page.setViewCallback(async (storyId) => {
            let params = new URLSearchParams(window.location.search)
            params.set("story", storyId)
            params.set("editor", false)
            window.location.search = params.toString();
            await updatePage();
        });

        page.setEditCallback(async (storyId) => {
            let params = new URLSearchParams(window.location.search)
            params.set("story", storyId)
            params.set("editor", true)
            window.location.search = params.toString();
            await updatePage();
        });

        await page.show(workspaceManger)
    }

    async function showEditorPage(workspaceManger) {
        let page = new EditorPage(d3.select('#content'));
        await mEventManager.setListener(page);
        // handel all the needed async stuff
        await page.show(workspaceManger);
    }

    async function showViewerPage(workspaceManger) {
        let page = new ViewerPage(d3.select('#content'));
        await mEventManager.setListener(page);
        // handel all the needed async stuff
        await page.show(workspaceManger);
    }

    await updatePage();
};