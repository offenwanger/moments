export const WORKSPACE_DATA_FILE = "workspace.json";
export const STORY_JSON_FILE = "story.json";
export const ASSET_FOLDER = "assets";

export const LookTarget = {
    LINE_SURFACE: 'line surface',
    MOMENT: 'moment',
    UP: 'up',
    NONE: 'none',
}

export const USER_HEIGHT = 1.6;
export const CAST_ONLY_LAYER = 4;

export const AssetTypes = {
    MODEL: 'model',
    IMAGE: 'image',
    TEXT: 'text',
    BOX: 'box',
}

export const AssetExtensions = {};
AssetExtensions[AssetTypes.MODEL] = '.glb'
AssetExtensions[AssetTypes.IMAGE] = '.png'
AssetExtensions[AssetTypes.BOX] = '.png'

export const BOX_ASSET_PREFIXES = ['px_', 'nx_', 'py_', 'ny_', 'pz_', 'nz_'];