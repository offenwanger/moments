import { EventManager } from './event_manager.js';
import { EditorPage } from './pages/editor_page.js';
import { ListPage } from './pages/list_page.js';
import { ViewerPage } from './pages/viewer_page.js';
import { WelcomePage } from './pages/welcome_page.js';
import { HandleStorage } from './utils/file_util.js';
import { WorkspaceManager } from './workspace_manager.js';

function main() {
    let mWelcomePage = new WelcomePage(d3.select('#content'));
    let mEditorPage = new EditorPage(d3.select('#content'));
    let mViewerPage = new ViewerPage(d3.select('#content'));
    let mListPage = new ListPage(d3.select('#content'));

    let mEventManager = new EventManager();

    mWelcomePage.setFolderSelectedCallback(async (folder) => {
        if (await folder.requestPermission({ mode: 'readwrite' }) === 'granted') {
            await HandleStorage.setItem('folder', folder);
        }
        updatePage();
    });

    mWelcomePage.setLastFolderCallback(async () => {
        let folder = await HandleStorage.getItem('folder');
        if (await folder.requestPermission({ mode: 'readwrite' }) !== 'granted') {
            await HandleStorage.removeItem('folder', () => { console.log('removed') });
        }
        updatePage();
    });


    mListPage.setViewCallback(async (storyId) => {
        let params = new URLSearchParams(window.location.search)
        params.set("story", storyId)
        params.set("editor", false)
        window.location.search = params.toString();
        await updatePage();
    });

    mListPage.setEditCallback(async (storyId) => {
        let params = new URLSearchParams(window.location.search)
        params.set("story", storyId)
        params.set("editor", true)
        window.location.search = params.toString();
        await updatePage();
    });

    async function updatePage() {
        let folder = await HandleStorage.getItem('folder');
        if (folder) {
            if (await folder.queryPermission({ mode: 'readwrite' }) !== 'granted') {
                setPage(mWelcomePage, [true]);
            } else {
                // folder all set
                let mWorkspaceManager = new WorkspaceManager(folder);
                let story = new URLSearchParams(window.location.search).get("story")
                if (story) {
                    let isEditor = new URLSearchParams(window.location.search).get("editor");
                    if (isEditor == 'true') {
                        setPage(mEditorPage, [mWorkspaceManager]);
                    } else {
                        setPage(mViewerPage, [mWorkspaceManager]);
                    }
                } else {
                    setPage(mListPage, [mWorkspaceManager]);
                }
            }
        } else {
            setPage(mWelcomePage, [])
        }
    }

    function setPage(page, args) {
        page.show(...args);
        mEventManager.setListener(page);
    }

    updatePage();
};
main();