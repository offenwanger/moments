
export function TextInput(container) {
    let mChangeCallback = async (newText) => { };

    let mInputContainer = container.append('div');
    let mInputLabel = mInputContainer.append('span');
    let mInputBox = mInputContainer.append('input')
        .attr('type', 'text')
        .on('blur', async () => {
            mChangeCallback(mInputBox.node().value);
        });

    this.setId = (id) => { mInputContainer.attr('id', id); return this; };
    this.setLabel = (text) => { mInputLabel.html(text); return this; };
    this.setText = (text) => { mInputLabel.node().value = text; return this; }
    this.setOnChange = (func) => { mChangeCallback = func; return this; };
}