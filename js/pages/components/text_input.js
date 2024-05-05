
export function TextInput(container, type = 'text') {
    let mChangeCallback = async (newText) => { };

    let mInputContainer = container.append('div');
    let mInputLabel = mInputContainer.append('span');
    let mInputBox = mInputContainer.append('input')
        .attr('type', type)
        .on('blur', async () => {
            let val = mInputBox.node().value;
            if (type == 'number') val = parseFloat(val);
            await mChangeCallback(val);
        });

    this.show = () => mInputContainer.style('display', '')
    this.hide = () => mInputContainer.style('display', 'none')
    this.setId = (id) => { mInputContainer.attr('id', id); return this; };
    this.setLabel = (text) => { mInputLabel.html(text); return this; };
    this.setText = (text) => { mInputBox.node().value = text; return this; }
    this.getText = () => { return mInputBox.node().value; }
    this.setOnChange = (func) => { mChangeCallback = func; return this; };
}