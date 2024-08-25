export function WelcomePage(parentContainer, lastFolder = false, mWebsocketController) {
    let mFolderSelectedCallback = async () => { };
    let mLastFolderCallback = async () => { };
    let mViewStoryCallback = async () => { };

    let div = parentContainer.append('div')
        .style('padding', "10px");
    div.append('h1').html("<h1>Welcome to Moments</h1>");
    div.append('p').html("This is an in development application for exploring the possibilities for and of immersive webcomics.");
    div.append('p').html("Please choose a folder where the application can store comics that you can then view.");
    div.append('button')
        .attr('id', 'choose-folder-button')
        .html("Choose Folder")
        .on('click', async () => {
            try {
                let folder = await window.showDirectoryPicker();
                await mFolderSelectedCallback(folder)
            } catch (e) {
                console.error(e);
            }
        });

    if (lastFolder) {
        div.append('button')
            .attr('id', 'use-last-folder-button')
            .html("Use Last Folder")
            .on('click', async () => {
                await mLastFolderCallback();
            });
    }

    div.append("h2").html("Shared Stories")
    let sharedList = div.append("div");
    mWebsocketController.onSharedStories((stories) => {
        sharedList.selectAll("*").remove();
        for (let story of stories) {
            let li = sharedList.append('li')
                .attr('id', story.id);
            li.append('span').html(story.name);
            li.append('button').html('👀')
                .classed('view-story-button', true)
                .style('margin-left', '10px')
                .on('click', async () => await mViewStoryCallback(story.id));
        }
    });
    mWebsocketController.requestStories();

    this.onFolderSelected = (func) => mFolderSelectedCallback = func;
    this.onLastFolder = (func) => mLastFolderCallback = func;
    this.onViewStory = (func) => mViewStoryCallback = func;
}