import Util from "./Util.js";
import VisualMatrix from "./VisualMatrix.js";
import Vector from "./Vector.js";
import PhysicsEntity from "./PhysicsEntity.js";
import Graph from "./Graph.js";
import {DcMotorEx, DcMotorSimple, DistanceSensor, DistanceUnit} from "./Transliteration.js";
import Pose from "./Pose.js";
import Telemetry from "./Telemetry.js";

export default class Robot extends PhysicsEntity {
    heightSensorOffset = -3;
    barrierHeight = 2;

    OFFSET_X = 4;
    OFFSET_Y = 1;

    rotCx = 0;
    rotCy = 18.5;

    highRung = new Vector(0, 36);

    theta = Util.rad(0);     // Radians clockwise
    width = 17;
    height = 10;
    unrotX = 0.5 + this.OFFSET_X + this.width / 2;
    unrotY = 0 + this.OFFSET_Y + this.height / 2;
    x = Util.rotX(this.unrotX, this.unrotY, -this.theta, this.rotCx, this.rotCy);
    y = Util.rotY(this.unrotX, this.unrotY, -this.theta, this.rotCx, this.rotCy);

    unrotatedTopLeft = new Vector(
        this.unrotX - this.OFFSET_X - this.width / 2,
        this.unrotY - this.OFFSET_Y - this.height / 2
    );
    centerOfMassOffset = new Vector(-this.OFFSET_X, -this.OFFSET_Y);
    // centerOfMassOffset = new Vector(0, 0);
    // centerOfMassOffset = new Vector(-this.OFFSET_X - this.width / 2, 0);
    hookingOffset = new Vector(-0.5 - this.OFFSET_X - this.width / 2, 0); // Distance out the y-axis is when the robot is vertical, on the ground

    hookRadius = 1.2;
    // armTheta = Util.rad(Util.rand(0, 90));  // Radians clockwise
    armTheta = 0;  // Radians clockwise
    initialArmLength = this.OFFSET_X + this.width / 2 - this.hookRadius - 0.5;
    armLength = this.initialArmLength; // Units left

    #key = Symbol("robot.distanceSensor key");
    #sensor = new DistanceSensor(this.#key);
    
    linearSlidePivot = new DcMotorEx(312, 537.7);
    linearSlideLift = new DcMotorEx(312, 537.7);
    // handLift = new DcMotorSimple(40, 1);  // High torque servo
    // handLift = new DcMotorSimple(90, 1);  // Speed servo
    handLift = new DcMotorSimple(180, 1); // Super speed servo
    handInchesPerRev = 0.3142759328996918863;

    constructor() {
        super(null);
        this.velocity.position = new Vector(0, -10);
        this.position.setX(this.x);
        this.position.setY(this.y);
        this.position.setTheta(this.theta);
        
        this.velocity.position = PhysicsEntity.restrictVelTo(
            this.getCenterOfMass(), // Velocity Vector tail
            this.velocity.position, // Downward vel
            new Vector(this.rotCx, this.rotCy) // Center of rotation
        );
        this.#sensor.setDistance(this.#key, DistanceUnit.INCH, this.y / Math.cos(this.theta) + this.heightSensorOffset);
    }

    getBoundingBox() {
        const boxX = this.x - this.OFFSET_X;
        const boxY = this.y - this.OFFSET_Y;
        const rotation = new VisualMatrix(
            Math.cos(-this.theta), -Math.sin(-this.theta),
            Math.sin(-this.theta),  Math.cos(-this.theta),

            // Translation stuffs
            -this.x * Math.cos(-this.theta) + this.y * Math.sin(-this.theta) + this.x,
            -this.x * Math.sin(-this.theta) - this.y * Math.cos(-this.theta) + this.y
        );
        return [
            (new Vector(boxX - this.width / 2, boxY - this.height / 2)).transform(rotation),
            (new Vector(boxX + this.width / 2, boxY - this.height / 2)).transform(rotation),
            (new Vector(boxX - this.width / 2, boxY + this.height / 2)).transform(rotation),
            (new Vector(boxX + this.width / 2, boxY + this.height / 2)).transform(rotation)
        ];
    }

    willCollideXAxis(poseVel) {
        const rotationalCenter = new Vector(this.rotCx, this.rotCy);
        const futureBox = this
            .getBoundingBox()
            .map(v => v
                .add(poseVel.position)
                .subtract(rotationalCenter)
                .transform(new VisualMatrix(
                    Math.cos(-poseVel.theta), -Math.sin(-poseVel.theta),
                    Math.sin(-poseVel.theta),  Math.cos(-poseVel.theta)
                ))
                .add(rotationalCenter)
            );
        return futureBox.some(v => v.y <= 0) && futureBox.some(v => v.y >= 0);
    }

    findXAxisCollisionPos(maxVel, maxDepth) {
        const rotationalCenter = new Vector(this.rotCx, this.rotCy);
        let min = 0;
        let max = maxVel;

        for(let depth = 0; depth < maxDepth; depth++) {
            const mid = (min + max) / 2;
            const posVel = new Pose(0, 0, mid);

            if(this.willCollideXAxis(posVel)) {
                max = mid;
            } else {
                min = mid;
            }
        }

        // Getting the final pose
        const mid = (min + max) / 2;
        const linearPosition = this.getLinearPos()
            .subtract(rotationalCenter)
            .transform(new VisualMatrix(
                Math.cos(-mid), -Math.sin(-mid),
                Math.sin(-mid),  Math.cos(-mid)
            ))
            .add(rotationalCenter);
        return new Pose(
            linearPosition.x,
            linearPosition.y,
            this.getTheta() + mid
        );
    } 
    
    findYAxisCollisionPos(maxVel, maxDepth, startY = -Infinity, endY = Infinity) {
        const rotationalCenter = new Vector(this.rotCx, this.rotCy);
        let min = 0;
        let max = maxVel;

        for(let depth = 0; depth < maxDepth; depth++) {
            const mid = (min + max) / 2;
            const posVel = new Pose(0, 0, mid);

            if(this.willCollideYAxis(posVel, startY, endY)) {
                max = mid;
            } else {
                min = mid;
            }
        }

        // Getting the final pose
        const mid = (min + max) / 2;
        const linearPosition = this.getLinearPos()
            .subtract(rotationalCenter)
            .transform(new VisualMatrix(
                Math.cos(-mid), -Math.sin(-mid),
                Math.sin(-mid),  Math.cos(-mid)
            ))
            .add(rotationalCenter);
        return new Pose(
            linearPosition.x,
            linearPosition.y,
            this.getTheta() + mid
        );
    } 

    /**
     * Determines whether the robot will collide with the y axis. This is judged 
     * based on the current velocity over some given time into the future.
     * 
     * @param {number} dt - Time into the future to experpolate, in seconds
     * @param {number} startY - Lowest y coordinate the axis can be contacted
     * @param {number} endY -  Highest y coordinate the axis an be contacted
     * @returns {boolean} True if a collision will occur; false otherwise.
     */
    willCollideYAxis(poseVel, startY = -Infinity, endY = Infinity) {
        const p = new Vector(0, startY);
        const v2 = new Vector(0, endY - startY);
        const addend2 = v2.y * p.x - v2.x * p.y;

        // Comparing each segment with the given y-axis segment
        const rotationalCenter = new Vector(this.rotCx, this.rotCy);
        const futureBox = this
            .getBoundingBox()
            .map(v => v
                .add(poseVel.position)
                .subtract(rotationalCenter)
                .transform(new VisualMatrix(
                    Math.cos(-poseVel.theta), -Math.sin(-poseVel.theta),
                    Math.sin(-poseVel.theta),  Math.cos(-poseVel.theta)
                ))
                .add(rotationalCenter)
            );
        
        for(let i = 0; i < futureBox.length; i++) {
            // Values related to just the box segment
            const a = futureBox[i];
            const v1 = futureBox[Util.loop(0, i + 1, futureBox.length)].subtract(a);
            const addend1 = v1.x * a.y - v1.y * a.x;
            
            // Values that factor in both segments
            const determ = v1.x * v2.y - v1.y * v2.x;
            const sum1 = Math.sign(determ) * (v2.x * a.y - v2.y * a.x + addend2);
            const sum2 = Math.sign(determ) * (v1.y * p.x - v1.x * p.y + addend1);

            // Testing the intersection
            if(
                   0 <= sum1
                && sum1 <= Math.abs(determ)
                && 0 <= sum2
                && sum2 <= Math.abs(determ)
            ) {
                return true;
            }
        }
    }

    getCenterOfMass() {
        const rotationCenter = new Vector(this.rotCx, this.rotCy);
        return this.centerOfMassOffset
            .add(Util.unrot(this.position.position, -this.theta, rotationCenter))
            .subtract(rotationCenter)
            .transform(new VisualMatrix([
                Math.cos(-this.theta), -Math.sin(-this.theta),
                Math.sin(-this.theta),  Math.cos(-this.theta)
            ]))
            .add(rotationCenter)
    }

    getTopLeft() {
        const rotationCenter = new Vector(this.rotCx, this.rotCy);
        return this.unrotatedTopLeft
            .subtract(rotationCenter)
            .transform(new VisualMatrix([
                Math.cos(-this.theta), -Math.sin(-this.theta),
                Math.sin(-this.theta),  Math.cos(-this.theta)
            ]))
            .add(rotationCenter)
    }

    update(elapsed, deltaTime /* Seconds */) {
        // Updating theta
        const rotationalCenter = new Vector(this.rotCx, this.rotCy);
        let deltaTheta = this.getAngularVel() * deltaTime; 

        if(this.willCollideXAxis(new Pose(0, 0, deltaTheta))) {
            this.position = this.findXAxisCollisionPos(deltaTheta, 100);
            this.velocity = new Pose(0, 0, 0);
            deltaTheta = 0;
        } else if(this.willCollideYAxis(new Pose(0, 0, deltaTheta), 0, this.barrierHeight)) {
            this.position = this.findYAxisCollisionPos(deltaTheta, 100, 0, this.barrierHeight);
            this.velocity = new Pose(0, 0, 0);
            deltaTheta = 0;
        }

        this.setTheta(this.getTheta() + deltaTheta);

        // Setting the x and y to reflect the rotation of the robot
        this.setLinearPos(this.getLinearPos()
            .subtract(rotationalCenter)
            .transform(new VisualMatrix([
                Math.cos(-deltaTheta), -Math.sin(-deltaTheta),
                Math.sin(-deltaTheta),  Math.cos(-deltaTheta),
            ]))
            .add(rotationalCenter)
        );

        // Adding gravity into the stuffs
        this.velocity.setY(this.velocity.getY() + deltaTime * PhysicsEntity.g);

        // Changing the theta velocity based on the new gravity-affected linear velocity
        this.velocity.setTheta(-PhysicsEntity.rotationalVelFrom(
            this.getCenterOfMass(), 
            this.getLinearVel(),
            rotationalCenter
        ));

        // Updating the linear velocity to accurately model the swinging motion
        this.setLinearVel(PhysicsEntity.linearVelFrom(
            this.getCenterOfMass(),
            -this.getAngularVel(),
            rotationalCenter
        ));

        // Settings the postions
        this.x = this.getX();
        this.y = this.getY();
        this.theta = this.getTheta();

        this.#sensor.setDistance(this.#key, DistanceUnit.INCH, this.y / Math.cos(this.theta) + this.heightSensorOffset);
    
        // Updating the arm stuff
        this.armLength = this.liftTicksToHookDistInches(this.linearSlideLift.getCurrentPosition());
        this.armTheta = this.pivotTicksToRadians(this.linearSlidePivot.getCurrentPosition());

        //DEV START: arm telemetry
        Telemetry.addData("length (in)", this.armLength);
        Telemetry.addData("length (ticks)", Math.floor(this.linearSlideLift.getCurrentPosition()));
        Telemetry.addData("theta (deg)", Util.deg(this.armTheta));
        Telemetry.addData("theta (ticks)", Math.floor(this.linearSlidePivot.getCurrentPosition()));
        // DEV END
    }

    render(ctx) {
        const inverseRotX = this.x * Math.cos(this.theta) - (this.y - this.rotCy) * Math.sin(this.theta);
        const inverseRotY = this.x * Math.sin(this.theta) + (this.y - this.rotCy) * Math.cos(this.theta) + this.rotCy;
        
        // Body
        // ctx.moveTo(this.x  - this.width / 2, this.y  - this.height / 2);
        ctx.save();
        ctx.translate(this.rotCx, this.rotCy);
        ctx.rotate(-this.theta);
        ctx.translate(-this.rotCx, -this.rotCy);

        ctx.lineWidth = Graph.scale(3);
        ctx.strokeStyle = "cyan";
        ctx.strokeRect(
            inverseRotX - this.OFFSET_X - this.width / 2, 
            inverseRotY - this.OFFSET_Y - this.height / 2, 
            this.width, 
            this.height
        );

        // Arm
        ctx.strokeStyle = "orange";
        ctx.lineWidth = Graph.scale(5);
        ctx.beginPath();
        ctx.moveTo(inverseRotX, inverseRotY);
        ctx.lineTo(
            inverseRotX - this.armLength * Math.cos(-this.armTheta), 
            inverseRotY - this.armLength * Math.sin(-this.armTheta)
        );
        ctx.stroke();
        
        // Hook
        ctx.lineWidth = Graph.scale(5);
        ctx.strokeStyle = "red";
        ctx.beginPath();
        ctx.arc(
            inverseRotX - this.armLength * Math.cos(-this.armTheta) - this.hookRadius * Math.cos(-Util.rad(90) - this.armTheta),
            inverseRotY - this.armLength * Math.sin(-this.armTheta) - this.hookRadius * Math.sin(-Util.rad(90) - this.armTheta),
            this.hookRadius,
            -this.armTheta - Util.rad(90),
            -this.armTheta - Util.rad(270), 
            true
        );
        ctx.stroke();
        
        // Hand
        const HAND_DIAM = 10;
        ctx.lineWidth = Graph.scale(5);
        ctx.strokeStyle = "rgb(43, 43, 255)";
        ctx.beginPath();
        ctx.moveTo(inverseRotX - this.OFFSET_X - this.width / 2, inverseRotY - this.OFFSET_Y - this.height / 2);
        ctx.lineTo(inverseRotX - this.OFFSET_X - this.width / 2, this.rotCy + Graph.scale(HAND_DIAM));
        ctx.lineTo(this.rotCx - Graph.scale(HAND_DIAM), this.rotCy + Graph.scale(HAND_DIAM));
        ctx.lineTo(this.rotCx - Graph.scale(HAND_DIAM), this.rotCy - Graph.scale(HAND_DIAM));
        ctx.stroke();
        ctx.restore();

        // CoM
        const com = this.getCenterOfMass();
        ctx.fillStyle = "white";
        ctx.beginPath();
        ctx.moveTo(com.x, com.y);
        ctx.arc(com.x, com.y, Graph.scale(5), 0, 2 * Math.PI);
        ctx.fill();

        // Barrier and ground
        ctx.lineWidth = Graph.scale(3);
        ctx.strokeStyle = "rgba(133, 196, 133, 255)";
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, this.barrierHeight);

        ctx.moveTo(Graph.minX, 0);
        ctx.lineTo(Graph.maxX, 0);
        ctx.stroke();

        // Rungs
        ctx.fillStyle = ctx.strokeStyle;
        ctx.beginPath();
        ctx.moveTo(this.highRung.x, this.highRung.y/* , 0.5, 0, Math.PI * 2 */);
        ctx.arc(this.highRung.x, this.highRung.y, 0.5, 0, Math.PI * 2);
        ctx.moveTo(this.rotCx, this.rotCy/* , 0.5, 0, Math.PI * 2 */);
        ctx.arc(this.rotCx, this.rotCy, 0.5, 0, Math.PI * 2);
        ctx.fill();
    }

    getSensor() {
        return this.#sensor;
    }

    actuate(deltaTime) {
        // Powering the lift
        this.handLift.setPower(1.0);
        const deltaRev = this.handLift._update(deltaTime);
        console.log(deltaRev);
        
        // Getting the upwards velocity and raising the thingy
        const rotationCenter = new Vector(this.rotCx, this.rotCy);
        this.setLinearPos(this.getLinearPos().add(
            new Vector(0, deltaRev * this.handInchesPerRev)
                .transform(new VisualMatrix(
                    Math.cos(-this.theta), -Math.sin(-this.theta),
                    Math.sin(-this.theta),  Math.cos(-this.theta)
                ))
        ));

        // Setting the theta to reflect the change
        // this.x = this.getX();
        // this.y = this.getY();
        // console.log(this.y);
        // this.theta = this.getTheta();

        // Cleaning up
        this.handLift.setPower(0);
    }

    powerLift(power, dt) {
        const previousPower = this.linearSlideLift.getPower();
        this.linearSlideLift.setPower(power);
        this.linearSlideLift._update(dt);
        this.linearSlideLift.setPower(previousPower);

        // Clamping the length of the arm
        this.linearSlideLift
            ._setCurrentPosition(Util.clamp(0, this.linearSlideLift.getCurrentPosition(), 4000));
    }

    powerPivot(power, dt) {
        const previousPower = this.linearSlidePivot.getPower();
        this.linearSlidePivot.setPower(power);
        this.linearSlidePivot._update(dt);
        this.linearSlidePivot.setPower(previousPower);

        // Clamping the position of the pivot
        this.linearSlidePivot
            ._setCurrentPosition(Util.clamp(0, this.linearSlidePivot.getCurrentPosition(), 6000));
    }

    /**
     * Finds how far the hook is away from the pivot. In other words, this 
     * converts lift ticks to inches, with an offset to desribe the hook's 
     * position.
     * 
     * @param {number} ticks
     * @return {number} The distance the hook is away from the pivot 
     */
    liftTicksToHookDistInches(ticks) {
        return this.liftTicksToInches(ticks) + this.initialArmLength;
    }
    
    /**
     * Calculates the extension of the arm out front. To be technical, this is 
     * not the length of the arm, as the arm cannot be length 0, but is rather
     * the length of the arm 
     * 
     * @param {number} ticks 
     * @returns Inches the arm has extended out once the motor driving the arm 
     *     has reach the given set point.
     */
    liftTicksToInches(ticks) {
        // FIXME: Test this to make sure its truly accurate to the length
        const EXTENSION_LIMIT = 42;
        const ROBOT_LENGTH = 17;
        return ticks * (EXTENSION_LIMIT - ROBOT_LENGTH) / 2500;
    }

    pivotTicksToRadians(ticks) {
        const GEARING = 28;
        const TICKS_PER_REV = 537.7;
        return ticks * (2 * Math.PI) / (GEARING * TICKS_PER_REV);
    }
}