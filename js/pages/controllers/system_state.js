import { BrushToolButtons, SurfaceToolButtons, ToolButtons } from "../../constants.js";

export class ToolMode {
    tool = ToolButtons.MOVE;
    brushSettings = {
        mode: BrushToolButtons.UNBLUR,
        // percent of sphereheight.
        brushWidth: 0.1,
    };
    surfaceSettings = {
        mode: SurfaceToolButtons.FLATTEN,
    };
    clone = function () {
        let mode = new ToolMode();
        Object.assign(mode, this)
        mode.brushSettings = Object.assign({}, this.brushSettings);
        mode.surfaceSettings = Object.assign({}, this.surfaceSettings);
        return mode;
    }
}