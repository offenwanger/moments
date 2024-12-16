import { Data } from "../data.js";
import { DataUtil } from "../utils/data_util.js";

export function ListPage(parentContainer) {
    let mEditCallback = async () => { };

    let mWorkspace;

    let h3 = document.createElement('h3');
    h3.textContent = "Stories";
    h3.style['margin'] = '10px';
    parentContainer.appendChild(h3);

    let mList = document.createElement('ul');
    parentContainer.appendChild(mList)

    let mNewStoryButton = document.createElement('button')
    mNewStoryButton.setAttribute('id', 'new-story-button')
    mNewStoryButton.style['margin-left'] = "40px";
    mNewStoryButton.textContent = "New Story";
    mNewStoryButton.addEventListener('click', async () => {
        if (!mWorkspace) { console.error('Workspace needed.'); return; }
        let newStory = new Data.StoryModel();
        let stories = await mWorkspace.getStoryList();
        newStory.name = DataUtil.getNextName('Story', stories.map(s => s.name))
        await mWorkspace.newStory(newStory.id)
        await mWorkspace.updateStory(newStory);
        await show(mWorkspace);
    });
    parentContainer.appendChild(mNewStoryButton)

    let mImportStoryButton = document.createElement('button')
    mImportStoryButton.setAttribute('id', 'import-story-button')
    mImportStoryButton.style['margin-left'] = "40px";
    mImportStoryButton.textContent = "Import Story"
    mImportStoryButton.addEventListener('click', async () => {
        try {
            let fileHandles = await window.showOpenFilePicker();
            let file = await fileHandles[0].getFile();
            await mWorkspace.loadStory(file);
            await show(mWorkspace);
        } catch (error) {
            console.error(error);
        }
    });
    parentContainer.appendChild(mImportStoryButton)

    async function show(workspace) {
        mWorkspace = workspace;

        let stories = await mWorkspace.getStoryList();
        mList.replaceChildren();
        stories.forEach(story => {
            let li = document.createElement('li');
            li.setAttribute('id', story.id)
            mList.appendChild(li);

            li.appendChild(Object.assign(document.createElement('span'), { innerHTML: story.name }));

            let button = document.createElement('button')
            button.setAttribute('id', 'edit-' + story.id)
            button.style['margin-left'] = '10px'
            button.textContent = '✏️';
            button.addEventListener('click', async () => await mEditCallback(story.id));
            li.appendChild(button)

            button = document.createElement('button')
            button.textContent = '🔽'
            button.setAttribute('id', 'download-' + story.id)
            button.style['margin-left'] = '10px';
            button.addEventListener('click', async () => await mWorkspace.packageStory(story.id));
            li.appendChild(button)

            button = document.createElement('button')
            button.textContent = '❌'
            button.setAttribute('id', 'delete-' + story.id);
            button.style['margin-left'] = '10px';
            button.addEventListener('click', async () => {
                if (confirm('Deleting "' + story.name + '", this cannot be undone, are you sure?') == true) {
                    try {
                        await mWorkspace.deleteStory(story.id);
                    } catch (error) {
                        console.error(error);
                    }
                    await show(mWorkspace);
                }
            });
            li.appendChild(button)
        });
    }

    this.show = show;
    this.setViewCallback = (func) => mViewCallback = func;
    this.setEditCallback = (func) => mEditCallback = func;
    this.setPackageCallback = (func) => mPackageCallback = func;
}