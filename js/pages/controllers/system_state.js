import { BrushToolButtons, SurfaceToolButtons, ToolButtons } from "../../constants.js";

export class ToolMode {
    tool = ToolButtons.MOVE;
    brushSettings = {
        mode: BrushToolButtons.UNBLUR,
        brushWidth: 10,
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