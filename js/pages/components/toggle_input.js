export function ToggleInput(container) {
    let mChangeCallback = async (val) => { };

    let mInputContainer = container.append('div');
    let mInputLabel = mInputContainer.append('span');
    let mInputBox = mInputContainer.append('input')
        .attr('type', 'checkbox')
        .on('change', async () => {
            await mChangeCallback(mInputBox.node().checked);
        });

    this.show = () => mInputContainer.attr('display', '')
    this.hide = () => mInputContainer.attr('display', 'none')
    this.remove = () => { mInputContainer.remove() }
    this.setId = (id) => { mInputContainer.attr('id', id); return this; };
    this.setLabel = (text) => { mInputLabel.html(text); return this; };
    this.setValue = (bool) => { mInputBox.node().checked = bool; return this; }
    this.setOnChange = (func) => { mChangeCallback = func; return this; };
}