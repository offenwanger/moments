const config = {
    "spec_dir": "spec",
    "spec_files": [
        "**/*.test.?(m)js"
    ],
    "helpers": [
        "helpers/**/*.?(m)js"
    ],
    "env": {
        "stopSpecOnExpectationFailure": false,
        "random": true
    }
};
export default config;