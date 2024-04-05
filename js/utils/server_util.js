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

export const ServerUtil = {
    fetchStory,
}
