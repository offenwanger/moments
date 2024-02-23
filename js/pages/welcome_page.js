export function WelcomePage(parentContainer) {
    let mFolderSelectedCallback = () => { };
    let mLastFolderCallback = () => { };

    function show(lastFolder = false) {
        parentContainer.selectAll("*").remove();
        let div = parentContainer.append('div')
            .style('padding', "10px");
        div.append('h1').html("<h1>Welcome to Moments</h1>");
        div.append('p').html("This is an in development application for exploring the possibilities for and of immersive webcomics.");
        div.append('p').html("Please choose a folder where the application can store comics that you can then view.");
        div.append('button').html("Choose Folder").on('click', async () => {
            try {
                let folder = await window.showDirectoryPicker();
                mFolderSelectedCallback(folder)
            } catch (e) {
                alert(e);
            }
        });
        if (lastFolder) {
            div.append('button').html("Use Last Folder").on('click', async () => {
                mLastFolderCallback();
            });
        }
    }

    this.show = show;
    this.setFolderSelectedCallback = (func) => mFolderSelectedCallback = func;
    this.setLastFolderCallback = (func) => mLastFolderCallback = func;
}