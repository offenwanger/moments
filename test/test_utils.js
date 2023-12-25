let chai = require('chai');
let expect = chai.expect;

function assertVectorEqual(v1, v2, tollerance = 0) {
    expect(v1.x).to.be.closeTo(v2.x, tollerance);
    expect(v1.y).to.be.closeTo(v2.y, tollerance);
    expect(v1.z).to.be.closeTo(v2.z, tollerance);
}

export {
    assertVectorEqual,
}