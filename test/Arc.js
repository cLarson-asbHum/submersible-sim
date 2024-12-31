import Vector from "/scripts/Vector.js";
import Arc from "/scripts/Arc.js";
import Util from "/scripts/Util.js";
import {expect, header, notEqual, within as approx} from "/test/global.js";

header("Arc.js");

// Testing that the arc constructs correctly
const a = new Arc(5, {
    center: new Vector(1, 3),
    startAngle: Util.rad(190),
    endAngle: Util.rad(-40)    
});

expect("consrct startAngle a", a.startAngle, Util.rad(-40));
expect("consrct endAngle a", a.endAngle, Util.rad(190));

// Testing that acessor-like methods work
expect("getR a", a.getR(), 5);
expect("normStartAngle a", a.getNormStartAngle(), Util.rad(-40), approx);
expect("normEndAngle a", a.getNormEndAngle(), Util.rad(-170), approx);

// Testing the full intersection methods
const approxVec = {
    symbol: approx.symbol,
    compare: (v1, v2) => approx.compare(v1?.x, v2?.x) && approx.compare(v1?.y, v2?.y)
};
const lazyApproxVec = {
    symbol: "~~~",
    compare: (v1, v2) => Math.abs(v1.x - v2.x) <= 0.001 && Math.abs(v1.y - v2.y) <= 0.001
};
const b = new Arc(5, {
    center: new Vector(2,2),
    startAngle: Util.rad(-90),
    endAngle: Util.rad(90),
    isBetween: false
});

expect("inter full + ab", a.intersectFull(b)?.[0], new Vector(-2,-1), approxVec);
expect("inter full - ab", a.intersectFull(b)?.[1], new Vector(5,6), approxVec);
expect("inter full + ba", b.intersectFull(a)?.[0], new Vector(5,6), approxVec);
expect("inter full - ba", b.intersectFull(a)?.[1], new Vector(-2,-1), approxVec);

const c = new Arc(12, {
    center: new Vector(0, -12),
    startAngle: Util.rad(-180),
    endAngle: Util.rad(45)
});

const acI1 = new Vector(-2.7411, -0.31726);
const acI2 = new Vector(4.2676,-0.7845);

expect("inter full + ac", a.intersectFull(c)?.[0], acI1, lazyApproxVec);
expect("inter full - ac", a.intersectFull(c)?.[1], acI2, lazyApproxVec);
expect("inter full + ca", c.intersectFull(a)?.[0], acI2, lazyApproxVec);
expect("inter full - ca", c.intersectFull(a)?.[1], acI1, lazyApproxVec);

// Testing the contains method
const d = new Arc(2, {
    center: new Vector(0, 0),
    startAngle: Util.rad(0),
    endAngle: Util.rad(360),
    isBetween: true
});

expect("contains  60deg a", a.contains(Util.rad(60)), true);
expect("contains -135deg a", a.contains(Util.rad(-135)), false);
expect("contains  60deg b", b.contains(Util.rad(60)), false);
expect("contains -135deg b", b.contains(Util.rad(-135)), true);
expect("contains  60deg c", c.contains(Util.rad(60)), false);
expect("contains -135deg c", c.contains(Util.rad(-135)), true);
expect("contains  60deg d", d.contains(Util.rad(60)), true);
expect("contains -135deg d", d.contains(Util.rad(-135)), false);

// Testing the arc normalization method
const normA = a.normalize();
const normB = b.normalize();
const normC = c.normalize();
const normD = d.normalize();

// console.log(normA, normB, normC, normD);

expect("contains  60deg norm a", normA.contains(Util.normAngle(Util.rad(60))), true);
expect("contains -135deg norm a", normA.contains(Util.normAngle(Util.rad(-135))), false);
expect("contains  60deg norm b", normB.contains(Util.normAngle(Util.rad(60))), false);
expect("contains -135deg norm b", normB.contains(Util.normAngle(Util.rad(-135))), true);
expect("contains  60deg norm c", normC.contains(Util.normAngle(Util.rad(60))), false);
expect("contains -135deg norm c", normC.contains(Util.normAngle(Util.rad(-135))), true);
expect("contains  60deg norm d", normD.contains(Util.normAngle(Util.rad(60))), true);
expect("contains -135deg norm d", normD.contains(Util.normAngle(Util.rad(-135))), true);

// Testing the sector contains method
function vec(theta, {center}) {
    return (new Vector(Math.cos(theta), Math.sin(theta))).add(center);
} 

expect("sector  60deg a", a.sectorContains(vec(Util.rad(60), a)), true);
expect("sector -135deg a", a.sectorContains(vec(Util.rad(-135), a)), false);
expect("sector  60deg b", b.sectorContains(vec(Util.rad(60), b)), false);
expect("sector -135deg b", b.sectorContains(vec(Util.rad(-135), b)), true);
expect("sector  60deg c", c.sectorContains(vec(Util.rad(60), c)), false);
expect("sector -135deg c", c.sectorContains(vec(Util.rad(-135), c)), true);
expect("sector  60deg d", d.sectorContains(vec(Util.rad(60), d)), true);
expect("sector -135deg d", d.sectorContains(vec(Util.rad(-135), d)), true);

// Testing the (partial) intersect method
const e = new Arc(2, {
    center: new Vector(-1, 0),
    startAngle: Util.rad(-180),
    endAngle: Util.rad(0),
    isBetween: false
});

const f = new Arc(2, {
    center: new Vector(-1, 0),
    startAngle: Util.rad(-180),
    endAngle: Util.rad(0),
    isBetween: true
});

expect("inter len de", d.intersect(e).length, 1);
expect("inter len df", d.intersect(f).length, 1);
expect("inter de != df", d.intersect(e)[0], d.intersect(f)[0], notEqual);

// Testing the line intersection method
const l = {
    a: 1,
    b: 0,
    c: 2
};

const m = {
    a: -2,
    b: 3,
    c: 4,
};

const n = {
    a: 1,
    b: 4,
    c: 5
}

const laziestApproxVec = {
    symbol: " .zZ ",
    compare: (v1, v2) => Math.abs(v1?.x - v2?.x) <= 0.01 && Math.abs(v1?.y - v2?.y) <= 0.01
}

expect("line + al", a.intersectLineFull(l.a, l.b, l.c)?.[0], new Vector(2, -1.9), laziestApproxVec);
expect("line - al", a.intersectLineFull(l.a, l.b, l.c)?.[1], new Vector(2, 7.9), laziestApproxVec);

expect("line + bl", b.intersectLineFull(l.a, l.b, l.c)?.[0], new Vector(2.0000, -3.0000), approxVec);
expect("line - bl", b.intersectLineFull(l.a, l.b, l.c)?.[1], new Vector(2.0000,  7.0000), approxVec);

expect("line + am", a.intersectLineFull(m.a, m.b, m.c)?.[0], new Vector(5.5637821, 5.04252), lazyApproxVec);
expect("line - am", a.intersectLineFull(m.a, m.b, m.c)?.[1], new Vector(-2.640705,-0.427135), lazyApproxVec);

expect("line + an", a.intersectLineFull(n.a, n.b, n.c)?.[0], new Vector(5,0), approxVec);
expect("line - an", a.intersectLineFull(n.a, n.b, n.c)?.[1], new Vector(-3.941175, 2.235294), lazyApproxVec);