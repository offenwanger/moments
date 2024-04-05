export function TwoButtonInput(container) {
    let mClickCallback1 = async () => { }
    let mClickCallback2 = async () => { await mClickCallback1() }

    let mButtonContainer = container.append('div')
        .style('display', 'flex')
        .style('flex-direction', 'row');

    let mButton1 = mButtonContainer.append('div')
        .style("background", "#d6d6d6")
        .style("padding", ".5em .75em")
        .style("cursor", "pointer")
        .style("user-select", "none")
        .style("box-shadow", "0 2px 3px 0 rgba(0,0,0,0.2), 0 6px 20px 0 rgba(0,0,0,0.19)")
        .style("margin", "5px");
    mButton1.on('click', async () => { await mClickCallback(); })
        .on('pointerup', () => { mButton1.style("background", "#d6d6d6") })
        .on('pointerdown', () => { mButton1.style("background", "#c6c6c6") })
        .on('pointerenter', () => { mButton1.style("background", "#e6e6e6") })
        .on('pointerout', () => { mButton1.style("background", "#d6d6d6") })

    let mButton2 = mButtonContainer.append('div')
        .style("background", "#d6d6d6")
        .style("padding", ".5em .75em")
        .style("cursor", "pointer")
        .style("user-select", "none")
        .style("box-shadow", "0 2px 3px 0 rgba(0,0,0,0.2), 0 6px 20px 0 rgba(0,0,0,0.19)")
        .style("margin", "5px");
    mButton2.on('click', async () => { await mSecondClickCallback(); })
        .on('pointerup', () => { mButton2.style("background", "#d6d6d6") })
        .on('pointerdown', () => { mButton2.style("background", "#c6c6c6") })
        .on('pointerenter', () => { mButton2.style("background", "#e6e6e6") })
        .on('pointerout', () => { mButton2.style("background", "#d6d6d6") })

    function setLabel(button, label) {
        if (button == 2) {
            mButton2.html(label);
        } else {
            mButton1.html(label);
        }

        let len1 = mButton1.html().length;
        let len2 = mButton2.html().length;

        mButton1.style('flex-grow', len1)
        mButton2.style('flex-grow', len2)

        return this;
    }

    this.show = () => { mButtonContainer.style('display', 'flex') }
    this.hide = () => { mButtonContainer.display('display', 'none') }
    this.setId = (id) => { mButtonContainer.attr('id', id); return this; }
    this.setLabel = setLabel;
    this.setOnClick = (button, func) => { button == 2 ? mClickCallback2 = func : mClickCallback1 = func; return this; };
}