import { Data } from "../data.js";

export function ListPage(parentContainer) {
    let mViewCallback = async () => { };
    let mEditCallback = async () => { };
    let mPackageCallback = async () => { };

    let mWorkspace;

    parentContainer.append('h3').html("Stories")
        .style('margin', '10px');
    let mList = parentContainer.append('ul');

    parentContainer.append('button')
        .attr('id', 'new-story-button')
        .style('margin-left', "40px")
        .html("New Story")
        .on('click', async () => {
            let newStory = new Data.StoryModel();
            await mWorkspace.newStory(newStory.id)
            await mWorkspace.updateStory(newStory);
            await show(mWorkspace);
        });

    parentContainer.append('button')
        .attr('id', 'import-story-button')
        .style('margin-left', "40px")
        .html("Import Story")
        .on('click', async () => {
            try {
                let fileHandles = await window.showOpenFilePicker();
                let file = await fileHandles[0].getFile();
                await mWorkspace.loadStory(file);
                await show(mWorkspace);
            } catch (error) {
                console.error(error);
            }
        });

    async function show(workspace) {
        mWorkspace = workspace;

        let stories = await mWorkspace.getStoryList();
        mList.selectAll('*').remove();
        stories.forEach(story => {
            let li = mList.append('li')
                .attr('id', story.id);
            li.append('span').html(story.name);
            li.append('button').html('✏️')
                .classed('edit-story-button', true)
                .style('margin-left', '10px')
                .on('click', async () => await mEditCallback(story.id));
            li.append('button').html('🔽')
                .classed('download-story-button', true)
                .style('margin-left', '10px')
                .on('click', async () => await mWorkspace.packageStory(story.id));
        });
    }

    this.show = show;
    this.setViewCallback = (func) => mViewCallback = func;
    this.setEditCallback = (func) => mEditCallback = func;
    this.setPackageCallback = (func) => mPackageCallback = func;
}