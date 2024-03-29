// TODO: Remove this
import * as THREE from 'three';

export const ServerUtil = function () {
    async function fetchStory(name) {
        let url = 'assets/stories/' + name + '.json'
        try {
            let response = await fetch(url);
            return response.json();
        } catch (error) {
            console.error(error);
            return null;
        }

    }

    return {
        fetchStory,
    }
}();