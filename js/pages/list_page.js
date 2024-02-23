import { DataModel } from "../data_model.js";

export function ListPage(parentContainer) {
    let mViewCallback = async () => { };
    let mEditCallback = async () => { };
    let mPackageCallback = async () => { };

    async function show(workspace) {
        parentContainer.selectAll("*").remove();

        parentContainer.append('h3').html("Stories")
            .style('margin', '10px');
        let list = parentContainer.append('ul');
        let stories = await workspace.getStoryList();
        stories.forEach(story => {
            let li = list.append('li');
            li.append('span').html(story.name);
            li.append('button').html('👁️')
                .style('margin-left', '10px')
                .on('click', async () => await mViewCallback(story.id));
            li.append('button').html('✏️')
                .style('margin-left', '10px')
                .on('click', async () => await mEditCallback(story.id));
            li.append('button').html('🔽')
                .style('margin-left', '10px')
                .on('click', async () => workspace.packageStory(story.id));
        });

        parentContainer.append('button')
            .style('margin-left', "40px")
            .html("New Story")
            .on('click', async () => {
                let newStory = new DataModel();
                await workspace.newStory(newStory.getStory().id)
                await workspace.updateStory(newStory);
                show(workspace);
            });

        parentContainer.append('button')
            .style('margin-left', "40px")
            .html("Load Story")
            .on('click', async () => {
                try {
                    let fileHandles = await window.showOpenFilePicker();
                    let file = await fileHandles[0].getFile();
                    await workspace.loadStory(file);
                    show(workspace);
                } catch (error) {
                    console.error(error);
                }
            });
    }

    this.show = show;
    this.setViewCallback = (func) => mViewCallback = func;
    this.setEditCallback = (func) => mEditCallback = func;
    this.setPackageCallback = (func) => mPackageCallback = func;
}