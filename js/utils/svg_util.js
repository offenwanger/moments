function addDropShadow(defs) {
    let filter = defs.append("filter")
        .attr("id", "dropshadow")
    filter.append("feGaussianBlur")
        .attr("in", "SourceAlpha")
        .attr("stdDeviation", 4)
        .attr("result", "blur");
    filter.append("feOffset")
        .attr("in", "blur")
        .attr("dx", 2)
        .attr("dy", 2)
        .attr("result", "offsetBlur");
    let feMerge = filter.append("feMerge");
    feMerge.append("feMergeNode")
        .attr("in", "offsetBlur")
    feMerge.append("feMergeNode")
        .attr("in", "SourceGraphic");
}

export const SvgUtil = {
    addDropShadow
}