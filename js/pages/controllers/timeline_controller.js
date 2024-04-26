import { DataModel } from "../../data_model.js";
import { SvgUtil } from "../../utils/svg_util.js"


export function TimelineController(container) {
    const LINE_PADDING = 20;
    const BUTTONS_AREA_WIDTH = 100;
    const BUTTON_SIZE = 40;

    let mModel = new DataModel();

    let mWidth = 10;
    let mHeight = 10;

    let mCreateMomentCallback = async () => { };

    const mTimelineSvg = container.append('svg')
        .attr('id', 'timeline-view')
        .style('display', 'block')
        .attr('width', 10)
        .attr('height', 10)
    const mDefs = mTimelineSvg.append("defs");

    SvgUtil.addDropShadow(mDefs);

    const mGroup = mTimelineSvg.append('g');

    let mXScale = d3.scaleLinear().domain([0, 1])
    let mTransform = d3.zoomIdentity;
    const mXAxis = mTimelineSvg.append("g").call(d3.axisBottom(mXScale));
    const mZoom = d3.zoom()
        .scaleExtent([1, 1000])
        .on("zoom", event => {
            mTransform = event.transform;
            mXAxis.call(d3.axisBottom(mTransform.rescaleX(mXScale)))
            mGroup.selectAll("circle").attr('cx', d => mTransform.rescaleX(mXScale)(d.t))
        });
    const mZoomRect = mTimelineSvg.append("rect")
        .style("fill", "none")
        .style("pointer-events", "all")
        .call(mZoom);

    const mButtonRect = mTimelineSvg.append('rect')
        .attr('id', 'button-rect')
        .attr('fill', 'white')
        .attr('width', BUTTONS_AREA_WIDTH)
    const mAddMomentButton = mTimelineSvg.append('image')
        .attr('id', 'add-moment-button')
        .attr('xlink:href', 'assets/images/buttons/add_moment_button.png')
        .attr('width', BUTTON_SIZE)
        .attr('height', BUTTON_SIZE)
        .attr('x', BUTTONS_AREA_WIDTH / 2 - BUTTON_SIZE / 2)
        .on("mouseover", function (d) {
            mAddMomentButton.attr("filter", "url(#dropshadow)");
        }).on("mouseout", function (d) {
            mAddMomentButton.attr("filter", "");
        }).on('pointerdown', () => {
            mAddMomentButton.attr("filter", "");
        }).on('click', async () => {
            await mCreateMomentCallback();
        });


    function updateModel(model) {
        mModel = model;

        let data = [
            { t: 0.1 },
            { t: 0.5 },
            { t: 0.11234 },
            { t: 0.175 },
        ];

        let selection = mGroup.selectAll("circle").data(data);
        selection.exit().remove();
        selection.enter().append("circle")
            .attr("r", 8)
            .style("fill", "#61a3a9")
            .style("opacity", 0.5)

        onResize(mWidth, mHeight);
    }

    function onResize(width, height) {
        mWidth = width;
        mHeight = height;

        mTimelineSvg.attr('width', width)
            .attr('height', height);

        mXScale.range([BUTTONS_AREA_WIDTH + LINE_PADDING, width - LINE_PADDING]);
        mXAxis.call(d3.axisBottom(mTransform.rescaleX(mXScale)))
        mGroup.selectAll("circle")
            .attr('cx', d => mTransform.rescaleX(mXScale)(d.t))
            .attr("cy", height / 2)
        mXAxis.attr("transform", "translate(0," + (height / 2) + ")")

        mZoom.extent([[0, 0], [width, height]])
            .translateExtent([[0, 0], [width, height]])
        mZoomRect.attr("width", width)
            .attr("height", height)

        mButtonRect.attr('height', height);
        mAddMomentButton.attr('y', height / 2 - BUTTON_SIZE / 2);
    }

    this.updateModel = updateModel;
    this.onResize = onResize;
    this.setCreateMomentCallback = (func) => { mCreateMomentCallback = func }
}