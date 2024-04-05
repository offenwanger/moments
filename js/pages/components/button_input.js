export function ButtonInput(container, secondButton = false) {
    let mClickCallback = async () => { }
    let mSecondClickCallback = async () => { await mClickCallback() }

    // [Button]
    // [ButtonWithEdit]
    // [Path Input]
    // [Asset Input]
    let mButtonContainer = container.append('div');

    let mButton = mButtonContainer.append('div')
        .style("background", "#d6d6d6")
        .style("padding", ".5em .75em")
        .style("cursor", "pointer")
        .style("user-select", "none")
        .style("box-shadow", "0 2px 3px 0 rgba(0,0,0,0.2), 0 6px 20px 0 rgba(0,0,0,0.19)")
        .style("margin", "5px");
    mButton.on('click', async () => { await mClickCallback(); })
        .on('pointerup', () => { mButton.style("background", "#d6d6d6") })
        .on('pointerdown', () => { mButton.style("background", "#c6c6c6") })
        .on('pointerenter', () => { mButton.style("background", "#e6e6e6") })
        .on('pointerout', () => { mButton.style("background", "#d6d6d6") })

    let mSecondButton;
    if (secondButton) {
        mSecondButton = mButtonContainer.append('div')
            .style("background", "#d6d6d6")
            .style("padding", ".5em .75em")
            .style("cursor", "pointer")
            .style("user-select", "none")
            .style("box-shadow", "0 2px 3px 0 rgba(0,0,0,0.2), 0 6px 20px 0 rgba(0,0,0,0.19)")
            .style("margin", "5px");
        mSecondButton.on('click', async () => { await mSecondClickCallback(); })
            .on('pointerup', () => { mButton.style("background", "#d6d6d6") })
            .on('pointerdown', () => { mButton.style("background", "#c6c6c6") })
            .on('pointerenter', () => { mButton.style("background", "#e6e6e6") })
            .on('pointerout', () => { mButton.style("background", "#d6d6d6") })
    }


    this.setId = (id) => { mButtonContainer.attr('id', id); return this; }
    this.setLabel = (label) => { mButton.html(label); return this; };
    this.setSecondLabel = (label) => { mSecondButton.html(label); return this; };
    this.setOnClick = (func) => { mClickCallback = func; return this; };
    this.setSecondOnClick = (func) => { mClickCallback = func; return this; };
}