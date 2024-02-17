export function mockIndexedDB() {
    this.open = function () {
        return {};
    }
}