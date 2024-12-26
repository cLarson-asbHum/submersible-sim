export default class Vector {
    x;
    y;
    constructor(x, y) {
        Object.assign(this, { x, y });
    }

    subtract(vec) {
        return new Vector(this.x - vec.x, this.y - vec.y);
    }

    add(vec) {
        return new Vector(this.x + vec.x, this.y + vec.y);
    }

    norm() {
        return Math.hypot(this.x, this.y);
    }

    sqrNorm() {
        return this.x * this.x + this.y * this.y;
    }

    arctan() {
        return Math.atan2(this.y, this.x);
    }

    dot(vec) {
        return this.x * vec.x + this.y * vec.y;
    }

    transform(matrix) {
        return new Vector(
            matrix.a * this.x + matrix.c * this.y + matrix.e,
            matrix.b * this.x + matrix.d * this.y + matrix.f 
        ); 
    }
    
    scale(scalar) {
        return new Vector(scalar * this.x, scalar * this.y);
    }

    toString() {
        return `Vector<${this.x}, ${this.y}>`;
    }
}