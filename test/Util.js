import Util from "/scripts/Util.js";
import { expect, within, notEqual, header } from "/test/global.js";

header("Util.js");

// Test the rad method
expect("rad 0", Util.rad(0), 0);
expect("rad 90d", Util.rad(90), Math.PI / 2)
expect("rad 360d", Util.rad(360), 2 * Math.PI);
expect("rad -135d", Util.rad(-135), -3/4 * Math.PI)
expect("rad inv 90", Util.rad(Util.deg(90)), 90, within);
expect("rad inv 180", Util.rad(Util.deg(180)), 180, within);

// Test the deg method
expect("deg 0", Util.deg(0), 0);
expect("deg pi/2", Util.deg(Math.PI / 2), 90);
expect("deg 2pi", Util.deg(Math.PI / 2), 90);
expect("rad -3/4pi", Util.deg(-3/4 * Math.PI), -135)
expect("rad inv 18", Util.deg(Util.rad(18)), 18, within);
expect("rad inv 1/2", Util.deg(Util.rad(1/2)), 1/2, within);

// Test the seconds method
expect("sec 0", Util.seconds(0), 0);
expect("sec 1000", Util.seconds(1000), 1);
expect("sec -9.8", Util.seconds(-9.8), -0.0098, within);
// expect("sec inv 314", Util.seconds(314));

// Test the lerp method
const a = -0.25;
const b = 5.6;
expect("lerp 0 ab", Util.lerp(a, 0, b), a);
expect("lerp 1 ab", Util.lerp(a, 1, b), b);
expect("lerp 1/2 ab", Util.lerp(a, 0.5, b), (a + b) / 2, within);

// Test the clamp method
expect("clamp 0 ab", Util.clamp(a, 0, b), 0);
expect("clamp 0.5 ab", Util.clamp(a, 0.5, b), 0.5);
expect("clamp 5.6 ab", Util.clamp(a, 5.6, b), 5.6);
expect("clamp 10 ab", Util.clamp(a, 10, b), b);
expect("clamp -1 ab", Util.clamp(a, -1, b), a);

// Making a quick method to test whether a context is clear (and testing it)
function dataTotal(ctx) {
    const {data} = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
    let total = 0;

    for(const pixelComponent of data) {
        total += pixelComponent;
    }

    return total;
}

const ctx = document.createElement('canvas').getContext('2d', {willReadFrequently: true});
expect("__isAllClear new", dataTotal(ctx), 0);

ctx.beginPath();
ctx.moveTo(0, 0);
ctx.lineTo(20, 20);
ctx.stroke();
expect("__isAllClear painted", dataTotal(ctx), 0, notEqual);

// TEsting the clear method
Util.clear(ctx);
expect("clear untransformed", dataTotal(ctx), 0);

ctx.setTransform(new DOMMatrix([2, 0, 0, 2, 10, 10]));
ctx.beginPath();
ctx.moveTo(0, 0);
ctx.lineTo(20, 20);
ctx.stroke();

expect("clear (control group)", dataTotal(ctx), 0, notEqual);
Util.clear(ctx);
expect("clear transformed", dataTotal(ctx), 0);

// Testing the loop method
expect("loop a ab", Util.loop(a, a, b), a);
expect("loop a + 1delta", Util.loop(a, a + (b-a), b), a);
expect("loop a + 2delta", Util.loop(a, a + 2 * (b-a), b), a);
expect("loop a + 0.5 + 2delta", Util.loop(a, a + 0.5 + 2 * (b-a), b), a + 0.5);
expect("loop a + 0.5 + 4delta", Util.loop(a, a + 0.5 + 4 * (b-a), b), a + 0.5);

// Testing the normAngle method
expect("norm 0", Util.normAngle(0), 0, within);
expect("norm 360deg", Util.normAngle(Util.rad(360)), 0, within);
expect("norm 45deg", Util.normAngle(Util.rad(45)), Util.rad(45), within);
expect("norm -130deg", Util.normAngle(Util.rad(-130)), Util.rad(-130), within);
expect("norm -270deg", Util.normAngle(Util.rad(-270)), Util.rad(90), within);
expect("norm 300deg", Util.normAngle(Util.rad(120)), Util.rad(120), within);
expect("norm -180deg", Util.normAngle(Util.rad(-180)), Util.rad(-180), within);
expect("norm +180deg", Util.normAngle(Util.rad(+180)), Util.rad(+180), within);