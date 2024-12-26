import PhysicsEntity from "./PhysicsEntity.js";
import VisualMatrix from "./VisualMatrix.js";

export default class Util {
    static rad(degrees) {
        return degrees * Math.PI / 180;
    }

    static deg(radians) {
        return radians * 180 / Math.PI;
    }

    static seconds(ms) {
        return ms * 0.001;
    }

    static lerp(a, t, b) {
        return t * (b - a) + a;
    }

    static clamp(min, x, max) {
        return Math.max(min, Math.min(x, max));
    }

    static clear(ctx) {
        ctx.save();
        ctx.resetTransform();
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.restore();
    }

    static rand(min, max) {
        return (max - min) * Math.random() + min;
    }

    static randI(min, max, step = 1) {
        return this.floor(this.rand(min, max + step), step);
    }

    static floor(x, step) {
        return Math.floor(x / step) * step;
    }
    
    static round(x, step) {
        return Math.round(x / step) * step;
    }
    
    static ceil(x, step) {
        return Math.ceil(x / step) * step;
    }

    static rotX(x, y, theta, cx = 0, cy = 0) {
        return (x - cx) * Math.cos(theta) - (y - cy) * Math.sin(theta) + cx;
    }
    
    static rotY(x, y, theta, cx = 0, cy = 0) {
        return (x - cx) * Math.sin(theta) + (y - cy) * Math.cos(theta) + cy;
    }

    static rot(vec, theta, rotC = new Vector(0, 0)) {
        return vec
            .subtract(rotC)
            .transform(new VisualMatrix([
                Math.cos(theta), -Math.sin(theta),
                Math.sin(theta), Math.cos(theta)
            ]))
            .add(rotC);
    }

    /*
        [  u cos(theta) + v sin(theta)  ]
        [ -u sin(theta) + v cos(theta)  ]
    */
    static unrot(rotVec, theta, rotC = new Vector(0, 0)) {
        return (rotVec
            .subtract(rotC)
            .transform(new VisualMatrix([
                Math.cos(-theta), -Math.sin(-theta),
                Math.sin(-theta), Math.cos(-theta)
            ]))
            .add(rotC)
        );
    }

    static mod(dividend, divisor) {
        return ((dividend % divisor) + divisor) % divisor;
    }
    
    static loop(min, x, max) {
        return Util.mod(x - min, max - min) + min;
    }

    static loopRem(min, x, max) {
        return ((x - min) % (max - min)) + min
    }
}