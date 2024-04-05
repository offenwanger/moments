export function NumericInput(inputsCount) {

    // [Number Input] x
    // [Offest Input] x, y
    // [Position Input] x, y, z
    // [Orientation input]

    let mChangeCallback = () => { }



    this.setLabel = function (i, label) {

    }
}

const NumbersInput = {
    create: (components) => {
        let inputGroup = d3.select('<div>')
            .style('margin-bottom', '10px')
            .style('margin-top', '10px')
            .append('span')
            .html('[');
        for (let i in labels) {
            let valueGroup = inputGroup.append('div');
            valueGroup.append('span').html(labels[i] + ":");
            valueGroup.append('span').attr('value-index', i);
            if (units[i]) {
                valueGroup.append('span').html(units[i]);
            }
            valueGroup.on('click', () => {
                valueGroup.style('display', 'none');
                inputBox.style('display', 'block');
                inputBox.node().focus();
            })
            let inputBox = inputGroup.append('input')
                .attr("type", 'number')
                .style('display', 'none')
                .attr('label', labels[i]);
            inputBox.on('blur', () => {
                valueGroup.style('display', 'block');
                inputBox.style('display', 'none');
            });
        }
        inputGroup.append('span').html(']')

        return inputGroup.node();
    },
    setEntryCallback: (numbersInput, func) => {
        console.log('stopped here')
    }
}