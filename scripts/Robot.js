import Util from "./Util.js";
import PhysicsEntity from "./PhysicsEntity.js";
import Graph from "./Graph.js";
import { DistanceSensor, DistanceUnit } from "./Transliteration.js";

export default class Robot extends PhysicsEntity {
    heightSensorOffset = -3;

    OFFSET_X = 4;
    OFFSET_Y = 1;

    rotCx = 0;
    rotCy = 18;

    theta = Util.rad(0);     // Radians clockwise
    // theta = Util.rad(1);     // Radians clockwise
    width = 17;
    height = 10;
    unrotX = 0.5 + this.OFFSET_X + this.width / 2;
    unrotY = 0 + this.OFFSET_Y + this.height / 2;
    x = Util.rotX(this.unrotX, this.unrotY, -this.theta, this.rotCx, this.rotCy);
    y = Util.rotY(this.unrotX, this.unrotY, -this.theta, this.rotCx, this.rotCy);

    unrotatedTopLeft = new PhysicsEntity.Vector(
        this.unrotX - this.OFFSET_X - this.width / 2,
        this.unrotY - this.OFFSET_Y - this.height / 2
    );
    centerOfMassOffset = new PhysicsEntity.Vector(-this.OFFSET_X / 2, -this.OFFSET_Y / 2);
    // centerOfMassOffset = new PhysicsEntity.Vector(0, 0);
    // centerOfMassOffset = new PhysicsEntity.Vector(-this.OFFSET_X - this.width / 2, 0);
    hookingOffset = new PhysicsEntity.Vector(-0.5 - this.OFFSET_X - this.width / 2, 0); // Distance out the y-axis is when the robot is vertical, on the ground

    hookRadius = 2;
    // armTheta = Util.rad(Util.rand(90, 180));  // Radians clockwise
    armTheta = 0;  // Radians clockwise
    initialArmLength = this.OFFSET_X + this.width / 2 - this.hookRadius - 0.5;
    armLength = this.initialArmLength; // Units left

    #key = Symbol("robot.distanceSensor key");
    #sensor = new DistanceSensor(this.#key);

    constructor() {
        super(null);
        this.velocity.position = new PhysicsEntity.Vector(0, -10);
        this.position.setX(this.x);
        this.position.setY(this.y);
        this.position.setTheta(this.theta);
        
        this.velocity.position = PhysicsEntity.restrictVelTo(
            this.getCenterOfMass(), // Velocity Vector tail
            this.velocity.position, // Downward vel
            new PhysicsEntity.Vector(this.rotCx, this.rotCy) // Center of rotation
        );
        this.#sensor.setDistance(this.#key, DistanceUnit.INCH, this.y / Math.cos(this.theta) + this.heightSensorOffset);
    }

    computeRobotTheta() {
        // Vector Componentns
        const {x: Px, y: Py} = this.position.position; 
        const {x: vx, y: vy} = this.position.position.add(this.hookingOffset); 
        const {rotCx: Cx, rotCy: Cy} = this; 

        // Parts of the formula
        const a =  (vx - Cx) * (vy - Py) + (vy - Cy) * (vx - Px);
        const b = -(vx - Cx) * (vx - Px) + (vy - Cy) * (vy - Py);
        const u = -(vx - Cx) * Py        - (vy - Cy) * Px;
        const sqrSum = a * a + b * b;
        const sqrSumRecip = 1 / sqrSum;
        return Math.asin(
            u * b * sqrSumRecip 
            + Math.abs(a) * sqrSumRecip * Math.sqrt(sqrSum - u * u)
        );
    }

    getCenterOfMass() {
        const rotationCenter = new PhysicsEntity.Vector(this.rotCx, this.rotCy);
        return this.centerOfMassOffset
            .add(Util.unrot(this.position.position, -this.theta, rotationCenter))
            .subtract(rotationCenter)
            .transform(new DOMMatrix([
                Math.cos(-this.theta), Math.sin(-this.theta),
                -Math.sin(-this.theta), Math.cos(-this.theta),
                0, 0 
            ]))
            .add(rotationCenter)
    }

    getTopLeft() {
        const rotationCenter = new PhysicsEntity.Vector(this.rotCx, this.rotCy);
        return this.unrotatedTopLeft
            .subtract(rotationCenter)
            .transform(new DOMMatrix([
                 Math.cos(-this.theta), Math.sin(-this.theta),
                -Math.sin(-this.theta), Math.cos(-this.theta),
                0, 0
            ]))
            .add(rotationCenter)
    }

    update(elapsed, deltaTime) {
        // Applying gravity
        this.velocity.position = this.velocity.position.add(new PhysicsEntity
            .Vector(0, PhysicsEntity.g)
            .scale(Util.seconds(deltaTime))
        );
        // this.checkCollisionY();
        this.velocity.position = PhysicsEntity.restrictVelTo(
            this.getCenterOfMass(), // Velocity Vector tail
            this.velocity.position, // Downward vel
            new PhysicsEntity.Vector(this.rotCx, this.rotCy) // Center of rotation
        );
        // this.velocity.setTheta(PhysicsEntity.rotationalVelFrom(
        //     this.getCenterOfMass(), // Velocity Vector Tail
        //     this.velocity.position, // Velocity,
        //     new PhysicsEntity.Vector(this.rotCx, this.rotCy) // Center of Rotation
        // ));
        this.setX(this.getX() + this.velocity.getX() * Util.seconds(deltaTime));
        this.setY(this.getY() + this.velocity.getY() * Util.seconds(deltaTime));
        this.setTheta(this.computeRobotTheta());

        // Theta is different cuz' of the hand
        // this.setTheta(new PhysicsEntity
        //     .Vector(this.rotCx, this.rotCy)
        //     .subtract(this.getTopLeft())
        //     .arctan()
        //     - Util.rad(45)
        // );

        // Settings the postions
        this.x = this.getX();
        this.y = this.getY();
        this.theta = this.getTheta();

        this.#sensor.setDistance(this.#key, DistanceUnit.INCH, this.y / Math.cos(this.theta) + this.heightSensorOffset);
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
    }

    getSensor() {
        return this.#sensor;
    }
}