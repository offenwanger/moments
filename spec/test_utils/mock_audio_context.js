export function mockAudioContext() {

    return {
        createGain: function () {
            return { connect: function () { } }
        },
        createMediaStreamSource: function () {
            return { connect: function () { } }
        },
        createPanner: function () {
            return { connect: function () { } }
        },
        createAnalyser: function () {
            return {
                getByteTimeDomainData: () => { }
            }
        }
    }
}