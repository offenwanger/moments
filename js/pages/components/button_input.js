export function ButtonInput(container) {
    let mClickCallback = async () => { }

    let mButton = document.createElement('div')
    mButton.style["background"] = "#d6d6d6";
    mButton.style["padding"] = ".5em .75em";
    mButton.style["cursor"] = "pointer";
    mButton.style["user-select"] = "none";
    mButton.style["box-shadow"] = "0 2px 3px 0 rgba(0,0,0,0.2), 0 6px 20px 0 rgba(0,0,0,0.19)";
    mButton.style["margin"] = "5px";
    mButton.addEventListener('click', async () => { await mClickCallback(); })
    mButton.addEventListener('pointerup', () => { mButton.style["background"] = "#d6d6d6" })
    mButton.addEventListener('pointerdown', () => { mButton.style["background"] = "#c6c6c6" })
    mButton.addEventListener('pointerenter', () => { mButton.style["background"] = "#e6e6e6" })
    mButton.addEventListener('pointerout', () => { mButton.style["background"] = "#d6d6d6" })
    container.appendChild(mButton)

    this.show = () => mButton.style['display'] = '';
    this.hide = () => mButton.style['display'] = 'none';
    this.remove = () => { container.removeChild(mButton) }
    this.setId = (id) => { mButton.setAttribute('id', id); return this; }
    this.setLabel = (label) => { mButton.textContent = label; return this; }
    this.setOnClick = (func) => { mClickCallback = func; return this; }
}