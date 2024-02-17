import { EditorPage } from './moment_editor/editor_page.js';
import { ListPage } from './moment_list/list_page.js';
import { ViewerPage } from './moment_viewer/viewer_page.js';
import { WelcomePage } from './moment_welcome/welcome_page.js';
import { HandleStorage } from './utils/file_util.js';
import { WorkspaceManager } from './workspace_manager.js';

function main() {
    console.log("Ok, next order of buisness is making the stories editable.")
    console.log("I need to be able to add assets so I can test my asset up/download.")
    console.log("I guess I should really start the entire interface creation process...")

    let mWelcomePage = new WelcomePage(d3.select('#content'));
    let mEditorPage = new EditorPage(d3.select('#content'));
    let mViewerPage = new ViewerPage(d3.select('#content'));
    let mListPage = new ListPage(d3.select('#content'));

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
                mWelcomePage.show(true);
            } else {
                // folder all set
                let mWorkspaceManager = new WorkspaceManager(folder);
                let storyName = new URLSearchParams(window.location.search).get("story")
                let storyFolder = storyName ? await folder.getDirectoryHandle(storyName) : null;
                if (storyFolder) {
                    let isEditor = new URLSearchParams(window.location.search).get("editor");
                    if (isEditor == 'true') {
                        mEditorPage.show(mWorkspaceManager);
                    } else {
                        mViewerPage.show(mWorkspaceManager);
                    }
                } else {
                    mListPage.show(mWorkspaceManager);
                }
            }
        } else {
            mWelcomePage.show();
        }
    }

    updatePage();
};
main();