import { expect, within, notEqual, header } from "/test/global.js";
import VisualMatrix from "/scripts/VisualMatrix.js"

header("VisualMatrix.js");

const matrixEq = {
    compare(a, b) {
        const PROPS = 'abcdef';
        for(const prop of PROPS) {
            if(a[prop] !== b[prop]) {
                return false;
            }
        }
        return true;
    },
    symbol: "2d equals"
}

const abcdef = [1, 2, 3, 4, 5, 7];
const a = abcdef[0];
const b = abcdef[1];
const c = abcdef[2];
const d = abcdef[3];
const e = abcdef[4];
const f = abcdef[5];

// Rest init
expect("matrix 0 arg", new VisualMatrix(), new DOMMatrix(), matrixEq);
expect(
    "matrix 4 arg abcd", 
    new VisualMatrix(
        a, b, 
        c, d
    ), 
    new DOMMatrix([a, c, b, d, 0, 0]), 
    matrixEq
);
expect(
    "matrix 6 arg abcdef", 
    new VisualMatrix(
        a, b,
        c, d,
        e, f
    ), 
    new DOMMatrix([a, c, b, d, e, f]), 
    matrixEq
);

// Array init
expect("matrix 0 arr", new VisualMatrix(), new DOMMatrix(), matrixEq);expect(
    "matrix 4 arr abcd", 
    new VisualMatrix([
        a, b, 
        c, d
    ]), 
    new DOMMatrix([a, c, b, d, 0, 0]), 
    matrixEq
);
expect(
    "matrix 6 arr abcdef", 
    new VisualMatrix([
        a, b,
        c, d,
        e, f
    ]), 
    new DOMMatrix([a, c, b, d, e, f]), 
    matrixEq
);