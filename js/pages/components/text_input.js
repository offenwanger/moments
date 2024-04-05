
export function TextInput(container, type = 'text') {
    let mChangeCallback = async (newText) => { };

    let mInputContainer = container.append('div');
    let mInputLabel = mInputContainer.append('span');
    let mInputBox = mInputContainer.append('input')
        .attr('type', type)
        .on('blur', async () => {
            await mChangeCallback(mInputBox.node().value);
        });

    this.show = () => mInputContainer.attr('display', '')
    this.hide = () => mInputContainer.attr('display', 'none')
    this.setId = (id) => { mInputContainer.attr('id', id); return this; };
    this.setLabel = (text) => { mInputLabel.html(text); return this; };
    this.setText = (text) => { mInputBox.node().value = text; return this; }
    this.setOnChange = (func) => { mChangeCallback = func; return this; };
}