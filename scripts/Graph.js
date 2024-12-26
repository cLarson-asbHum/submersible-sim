import Util from "./Util.js"
import VisualMatrix from "./VisualMatrix.js";

export default class Graph {
    static STEP_X = 9;
    static STEP_Y = 9;
    static pixelsPerIn = 10;

    static #transformation = new VisualMatrix();
    static minY = 0;
    static maxY = 0;
    static maxX = 0;

    static transform(ctx) {
        const canvas = ctx.canvas;

        ctx.setTransform(this.#transformation = new VisualMatrix([
            this.pixelsPerIn,     0,                    200,
            0,                   -this.pixelsPerIn,     canvas.height - 100,
            0,                    0,                    1,
        ]));

        this.minX = this.x(0);
        this.maxX = this.x(canvas.width);
        this.minY = this.y(canvas.height);
        this.maxY = this.y(0);
    }

    static x(px) {
        return (px - this.#transformation.e) / this.#transformation.a;
    }
    
    static y(px) {
        return (px - this.#transformation.f) / this.#transformation.d;
    }

    static scale(px) {
        return px / this.pixelsPerIn;
    }

    static drawAxes(ctx, xStep = this.STEP_X, yStep = this.STEP_Y) {
        ctx.save();
        // Axes
        ctx.strokeStyle = ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
        ctx.lineWidth = this.scale(5);
        ctx.beginPath();
        ctx.moveTo(this.minX, 0);
        ctx.lineTo(this.maxX, 0);
        ctx.moveTo(0, this.minY);
        ctx.lineTo(0, this.maxY);
        ctx.stroke();
        ctx.fill();


        // Drawing the x labels
        if(xStep > 0) {
            ctx.setTransform(this.#transformation.multiply(new VisualMatrix([
                1,  0, 0,
                0, -1, -1,
                0,  0, 1,
            ])));

            const fontHeight = this.scale(20);
            ctx.font = `${fontHeight}px serif`;
            ctx.fillStyle = "white";
            for(let x = xStep; x <= this.maxX; x += xStep) {
                ctx.fillText(`${x}`, x, fontHeight);
            }

            for(let x = -xStep; x >= this.minX; x -= xStep) {
                ctx.fillText(`${x}`, x, fontHeight);
            }
        }

        // Drawing the y labels
        if(yStep > 0) {
            ctx.setTransform(this.#transformation.multiply(new VisualMatrix([
                1,  0, 0,
                0, -1, -1,
                0,  0, 1,
            ])));

            const fontHeight = this.scale(20);
            ctx.font = `${fontHeight}px serif`;
            ctx.fillStyle = "white";
            // console.log(this.minY, this.maxY);
            for(let y = yStep; y <= this.maxY; y += yStep) {
                ctx.fillText(`${y}`, Graph.scale(10), -y);
            }

            for(let y = -yStep; y >= this.minY; y -= yStep) {
                ctx.fillText(`${y}`, Graph.scale(10), -y);
            }
        }

        ctx.restore();
    }
}