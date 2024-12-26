import Util from "./Util.js";
import Vector from "./Vector.js";
import Pose from "./Pose.js";

export default class PhysicsEntity {
    static g = -386.08858267717; // inches/sec^2

    static restrictVelTo(origin, vel, pivot) {
        const delta = origin.subtract(pivot);
        const distFromPivotSqr = delta.sqrNorm();

        if(Math.abs(distFromPivotSqr) <= 1e-10) {
            // The distance from the center is (pretty much) very, return 0.
            return 0;
        } 

        const mediate = (delta.y * vel.x - delta.x * vel.y) / distFromPivotSqr;

        return new Vector(delta.y * mediate, -delta.x * mediate)
    }

    /**
     * Returns rotational velocity based on a velocity vector and a pivot
     */
    static rotationalVelFrom(origin, vel, pivot) {
        const delta = origin.subtract(pivot);
        const distFromPivotSqr = delta.sqrNorm();

        if(Math.abs(distFromPivotSqr) <= 1e-10) {
            // The distance from the center is (pretty much) very, return 0.
            return 0;
        } 

        // + if couner clockwise; - if clockwise
        return (delta.x * vel.y - delta.y * vel.x) / (2 * Math.PI * distFromPivotSqr);
    }

    static linearVelFrom(origin, angVel /* number */, pivot) {
        const delta = origin.subtract(pivot);
        const distFromPivotSqr = delta.sqrNorm();

        if(Math.abs(distFromPivotSqr) <= 1e-10) {
            // The distance from the center is (pretty much) very, return 0.
            return new Vector(0, 0);
        } 

        const magnitude = angVel * (2 * Math.PI * Math.sqrt(distFromPivotSqr));
        return delta
            .scale(magnitude / Math.sqrt(distFromPivotSqr))
            .transform(new DOMMatrix([0, 1, -1, 0, 0, 0]));
    }

    static deltaVel(accel, dt) {
        return accel * dt;
    }

    static deltaDistVel(vel, dt) {
        return vel * dt;
    }

    static deltaDistAccel(accel, dt, lastVelocity) {
        return 0.5 * accel * dt * dt + dt * lastVelocity;
    }


    position = new Pose(0, 0, 0);
    velocity = new Pose(0, 0, 0);

    constructor(pos) {
        if(pos instanceof Pose) {
            this.position = pos;
        }
    }

    getX() {
        return this.position.getX();
    }

    getY() {
        return this.position.getY();
    }

    getTheta() {
        return this.position.getTheta();
    }

    setX(x) {
        return this.position.setX(x);
    }

    setY(y) {
        return this.position.setY(y);
    }

    setTheta(theta) {
        return this.position.setTheta(theta);
    }

    accel(a, dt) {
        // console.log(a, dt);
        // Positions
        const dx = PhysicsEntity.deltaDistAccel(a.getX(), dt, this.velocity.getX())
        const dy = PhysicsEntity.deltaDistAccel(a.getY(), dt, this.velocity.getY())
        const dth = PhysicsEntity.deltaDistAccel(a.getTheta(), dt, this.velocity.getTheta());

        this.setX(this.getX() + dx);
        this.setY(this.getY() + dy);
        this.setTheta(this.getTheta() + dth);
        
        // Velocities
        this.velocity.position = this.velocity.position.add(a.position.scale(dt));
        this.velocity.theta = this.velocity.theta + a.theta * dt;
    }

    stop() {
        this.velocity = new Pose(0, 0, 0);
    }

    collisionY(dt, y) {
        if(this.getLinearVel().scale(dt).y + this.y <= y) {
            this.setLinearVel(new Vector(0,0 ));
            this.setAngularVel(0);
        }
    }

    // @Abstract
    update(elapsed, deltaTime) {
        throw ReferenceError("PhysicsEntity.prototype.update is an abstract method an must be overriden in an implenting subclass.");
    }

    getLinearPos() {
        return this.position.position;
    }

    
    setLinearPos(newLinear) {
        return this.position.position = newLinear;
    }

    getLinearVel() {
        return this.velocity.position;
    }

    
    setLinearVel(newLinear) {
        return this.velocity.position = newLinear;
    }

    getAngularPos() {
        return this.position.theta;
    }

    setAngularPos(newAngular) {
        return this.position.theta = newAngular;
    }

    getAngularVel() {
        return this.velocity.theta;
    }

    setAngularVel(newAngular) {
        return this.velocity.theta = newAngular;
    }
}