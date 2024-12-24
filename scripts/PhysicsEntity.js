import Util from "./Util.js";

export default class PhysicsEntity {
    static g = -386.08858267717; // inches/sec^2
    
    static Vector = class {
        x;
        y;
        constructor(x, y) {
            Object.assign(this, { x, y });
        }

        subtract(vec) {
            return new PhysicsEntity.Vector(this.x - vec.x, this.y - vec.y);
        }

        add(vec) {
            return new PhysicsEntity.Vector(this.x + vec.x, this.y + vec.y);
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
            return new PhysicsEntity.Vector(
                matrix.a * this.x + matrix.c * this.y + matrix.e,
                matrix.b * this.x + matrix.d * this.y + matrix.f 
            ); 
        }
        
        scale(scalar) {
            return new PhysicsEntity.Vector(scalar * this.x, scalar * this.y);
        }

        toString() {
            return `Vector<${this.x}, ${this.y}>`;
        }
    }

    static Pose = class {
        position
        theta;

        constructor(x, y, theta) {
            this.position = new PhysicsEntity.Vector(x, y);
            this.theta = theta;
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

    static restrictVelTo(origin, vel, pivot) {
        const delta = origin.subtract(pivot);
        const distFromPivotSqr = delta.sqrNorm();

        if(Math.abs(distFromPivotSqr) <= 1e-10) {
            // The distance from the center is (pretty much) very, return 0.
            return 0;
        } 

        const mediate = (delta.y * vel.x - delta.x * vel.y) / distFromPivotSqr;

        return new PhysicsEntity
            .Vector(delta.y * mediate, -delta.x * mediate)
    }

    /**
     * Returns rotational velocity based on a velocity vector and a pivot
     */
    static rotationalVelFrom(origin, vel, pivot) {
        const delta = pivot.subtract(origin);
        const distFromPivotSqr = delta.sqrNorm();

        if(Math.abs(distFromPivotSqr) <= 1e-10) {
            // The distance from the center is (pretty much) very, return 0.
            return 0;
        } 

        return (delta.x * vel.y - delta.y * vel.x) / (2 * Math.PI * distFromPivotSqr);
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

    static collisionY(vel, origin, y) {
        if(origin.getY() + vel.getY() <= y) {
            return vel.scale(-1);
        } 

        return vel;
    }


    position = new PhysicsEntity.Pose(0, 0, 0);
    velocity = new PhysicsEntity.Pose(0, 0, 0);
    centerOfMass = new PhysicsEntity.Vector(0, 0);

    constructor(pos) {
        if(pos instanceof PhysicsEntity.Pose) {
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
        this.velocity = new PhysicsEntity.Pose(0, 0, 0);
    }

    collisionY(y) {
        this.velocity = this.velcotity.add(PhysicsEntity.collisionY(y));
    }

    // @Abstract
    update(elapsed, deltaTime) {
        throw ReferenceError("PhysicsEntity.prototype.update is an abstract method an must be overriden in an implenting subclass.");
    }
}