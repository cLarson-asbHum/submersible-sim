import Vector from "./Vector.js";

export default class Pose {
    position
    theta;

    constructor(x, y, theta) {
        this.position = new Vector(x, y);
        this.theta = theta;
    }

    scale(scalar) {
        return new Pose(this.getX() * scalar, this.getY() * scalar, this.getTheta() * scalar);
    }

    getX() {
        return this.position.x;
    }
    
    getY() {
        return this.position.y;
    }

    getTheta() {
        return this.theta;
    }

    setX(newX) {
        this.position.x = newX;
    }
    
    setY(newY) {
        this.position.y = newY;
    }

    setTheta(theta) {
        return this.theta = theta;
    }
}