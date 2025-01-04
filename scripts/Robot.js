import Util from "./Util.js";
import VisualMatrix from "./VisualMatrix.js";
import Vector from "./Vector.js";
import PhysicsEntity from "./PhysicsEntity.js";
import Graph from "./Graph.js";
import {DcMotorEx, DcMotorSimple, DistanceSensor, DistanceUnit} from "./Transliteration.js";
import Pose from "./Pose.js";
import Telemetry from "./Telemetry.js";
import Arc from "./Arc.js"

// DEV START: Drawing logg
const canvas = document.querySelector('canvas');
const ctx = canvas.getContext('2d');
// DEV END
            
export default class Robot extends PhysicsEntity {
    heightSensorOffset = -3;
    barrierHeight = 2;

    OFFSET_X = 4;
    OFFSET_Y = 1;

    rotCx = 0;
    rotCy = 18.5;
    #rotationalCenter = new Vector(this.rotCx, this.rotCy);

    highRung = new Vector(0, 36);

    #theta = Util.rad(0);     // Radians clockwise
    width = 17;
    height = 10;
    unrotX = 0.5 + this.OFFSET_X + this.width / 2;
    #unrotY = Util.rand(0, 2) + this.OFFSET_Y + this.height / 2;
    #x = Util.rotX(this.unrotX, this.#unrotY, -this.#theta, this.rotCx, this.rotCy);
    #y = Util.rotY(this.unrotX, this.#unrotY, -this.#theta, this.rotCx, this.rotCy);

    unrotatedTopLeft = new Vector(
        this.unrotX - this.OFFSET_X - this.width / 2,
        this.#unrotY - this.OFFSET_Y - this.height / 2
    );
    #centerOfMassOffset = new Vector(-this.OFFSET_X, -this.OFFSET_Y);
    // centerOfMassOffset = new Vector(0, 0);
    // centerOfMassOffset = new Vector(-this.OFFSET_X - this.width / 2, 0);
    hookingOffset = new Vector(-0.5 - this.OFFSET_X - this.width / 2, 0); // Distance out the y-axis is when the robot is vertical, on the ground

    hookRadius = 1.25;
    // #armTheta = Util.rad(Util.rand(0, 90));  // Radians clockwise
    #armTheta = 0;  // Radians clockwise
    initialArmLength = this.OFFSET_X + this.width / 2 - this.hookRadius - 0.5;
    #armLength = this.initialArmLength; // Units left

    #key = Symbol("robot.distanceSensor key");
    #sensor = new DistanceSensor(this.#key);
    
    linearSlidePivot = new DcMotorEx(312, 537.7);
    linearSlideLift = new DcMotorEx(312, 537.7);
    #deltaPivotPos = 0;
    #deltaLiftPos = 0;
    #deltaHandPos = 0;
    // handLift = new DcMotorSimple(40, 1);  // High torque servo
    // handLift = new DcMotorSimple(90, 1);  // Speed servo
    handLift = new DcMotorSimple(180, 1); // Super speed servo
    #handInchesPerRev = -0.3142759328996918863;

    constructor() {
        super(null);
        this.velocity.position = new Vector(0, 0);
        this.position.setX(this.#x);
        this.position.setY(this.#y);
        this.position.setTheta(this.#theta);
        
        this.velocity.position = PhysicsEntity.restrictVelTo(
            this.#getCenterOfMass(), // Velocity Vector tail
            this.velocity.position, // Downward vel
            new Vector(this.rotCx, this.rotCy) // Center of rotation
        );
        this.#sensor.setDistance(this.#key, DistanceUnit.INCH, this.#y / Math.cos(this.#theta) + this.heightSensorOffset);

        // DEV START: setting the motor positions to be nice
        this.linearSlideLift._setCurrentPosition(Util.rand(0, 3000));
        this.linearSlidePivot._setCurrentPosition(Util.rand(0, 3000));
        this.#armTheta = this.#pivotTicksToRadians(this.linearSlidePivot.getCurrentPosition());
        this.#armLength = this.#liftTicksToHookDistInches(this.linearSlideLift.getCurrentPosition());
        // DEV END
    }

    #getBoundingBox() {
        const boxX = this.#x - this.OFFSET_X;
        const boxY = this.#y - this.OFFSET_Y;
        const rotation = new VisualMatrix(
            Math.cos(-this.#theta), -Math.sin(-this.#theta),
            Math.sin(-this.#theta),  Math.cos(-this.#theta),

            // Translation stuffs
            -this.#x * Math.cos(-this.#theta) + this.#y * Math.sin(-this.#theta) + this.#x,
            -this.#x * Math.sin(-this.#theta) - this.#y * Math.cos(-this.#theta) + this.#y
        );
        return [
            (new Vector(boxX - this.width / 2, boxY - this.height / 2)).transform(rotation),
            (new Vector(boxX + this.width / 2, boxY - this.height / 2)).transform(rotation),
            (new Vector(boxX - this.width / 2, boxY + this.height / 2)).transform(rotation),
            (new Vector(boxX + this.width / 2, boxY + this.height / 2)).transform(rotation)
        ];
    }

    #willCollideXAxis(poseVel) {
        const futureBox = this
            .#getBoundingBox()
            .map(v => v
                .add(poseVel.position)
                .subtract(this.#rotationalCenter)
                .transform(new VisualMatrix(
                    Math.cos(-poseVel.theta), -Math.sin(-poseVel.theta),
                    Math.sin(-poseVel.theta),  Math.cos(-poseVel.theta)
                ))
                .add(this.#rotationalCenter)
            );
        return futureBox.some(v => v.y <= 0) && futureBox.some(v => v.y >= 0);
    }

    #findXAxisCollisionPos(maxVel, maxDepth) {
        let min = 0;
        let max = maxVel;

        for(let depth = 0; depth < maxDepth; depth++) {
            const mid = (min + max) / 2;
            const posVel = new Pose(0, 0, mid);

            if(this.#willCollideXAxis(posVel)) {
                max = mid;
            } else {
                min = mid;
            }
        }

        // Getting the final pose
        const mid = (min + max) / 2;
        const linearPosition = this.getLinearPos()
            .subtract(this.#rotationalCenter)
            .transform(new VisualMatrix(
                Math.cos(-mid), -Math.sin(-mid),
                Math.sin(-mid),  Math.cos(-mid)
            ))
            .add(this.#rotationalCenter);
        return new Pose(
            linearPosition.x,
            linearPosition.y,
            this.getTheta() + mid
        );
    } 
    
    #findYAxisCollisionPos(maxVel, maxDepth, startY = -Infinity, endY = Infinity) {
        let min = 0;
        let max = maxVel;

        for(let depth = 0; depth < maxDepth; depth++) {
            const mid = (min + max) / 2;
            const posVel = new Pose(0, 0, mid);

            if(this.#willCollideYAxis(posVel, startY, endY)) {
                max = mid;
            } else {
                min = mid;
            }
        }

        // Getting the final pose
        const mid = (min + max) / 2;
        const linearPosition = this.getLinearPos()
            .subtract(this.#rotationalCenter)
            .transform(new VisualMatrix(
                Math.cos(-mid), -Math.sin(-mid),
                Math.sin(-mid),  Math.cos(-mid)
            ))
            .add(this.#rotationalCenter);
        return new Pose(
            linearPosition.x,
            linearPosition.y,
            this.getTheta() + mid
        );
    } 

    #getHookArc() {
        /*ctx.arc(
            inverseRotX - this.armLength * Math.cos(-this.armTheta) - this.hookRadius * Math.cos(-Util.rad(90) - this.armTheta),
            inverseRotY - this.armLength * Math.sin(-this.armTheta) - this.hookRadius * Math.sin(-Util.rad(90) - this.armTheta),
            this.hookRadius,
            -this.armTheta - Util.rad(90),
            -this.armTheta - Util.rad(270), 
            true
        ); */
        const arc = new Arc(this.hookRadius, {
        // return new Arc(this.hookRadius, {
            isBetween: true,
            startAngle:  -this.#armTheta + Util.rad(90) - this.#theta,
            endAngle:  -this.#armTheta + Util.rad(270) - this.#theta,
            center: this.getLinearPos().add(
                new Vector(-this.#armLength, this.hookRadius).transform(new VisualMatrix(
                    Math.cos(-this.#armTheta - this.#theta), -Math.sin(-this.#armTheta - this.#theta),
                    Math.sin(-this.#armTheta - this.#theta),  Math.cos(-this.#armTheta - this.#theta)
                ))
            )
        });
        Telemetry.addLine('\n--------- New Hook Arc --------\n');
        Telemetry.addData('new hook start (deg)', Util.deg(arc.startAngle));
        Telemetry.addData('new hook end (deg)', Util.deg(arc.endAngle));
        return arc;
    }

    #findHookAngularCollisions(theta, /* ctx = null, */ center = this.#rotationalCenter) {
        const hook = this.#getHookArc();

        // Getting the arc that corresponds to the high rungs's motion
        const rungRadiusTheta = Math.atan(1/36);
        const rungStartAngle = Util.rad(90);
        const rungPath = new Arc(this.highRung.y - center.y, {
            center,
            startAngle: rungStartAngle + Math.sign(theta) * rungRadiusTheta,
            endAngle: rungStartAngle - theta - Math.sign(theta) * rungRadiusTheta,
            isBetween: true,
        });

        // DEV START: Graphing the arc so that it makes sense
        ctx.lineWidth = Graph.scale(5);
        ctx.strokeStyle = "lime";
        ctx.beginPath();
        Telemetry.addData("rungPath.startAngle", rungPath.startAngle) 
        Telemetry.addData("rungPath.endAngle", rungPath.endAngle);
        const path = rungPath.normalize();
        ctx.arc(path.getX(), path.getY(), rungPath.getR(), path.startAngle, path.endAngle, !path.isBetween);
        ctx.stroke();
        // DEV END

        return hook.intersect(rungPath).map(v => v.subtract(rungPath.center).arctan());
    }

    #findHookLinearCollisions(vel) {
        // Getting the hook and the intersections
        const hook = this.#getHookArc();
        const intersections = hook.intersectLineFull(-vel.y, vel.x, vel.x * this.highRung.y);

        // Filtering the intersections done to those only on the figures
        const midpoint = this.highRung.add(vel.scale(0.5));
        function isInBoundingBox(v) {
            return Math.abs(v.x - midpoint.x) < Math.abs(0.5 * vel.x)
             && Math.abs(v.y - midpoint.y) < Math.abs(0.5 * vel.y);
        }

        const oneFiltered = intersections.filter(isInBoundingBox); // only those on the *segment*, not line
        const bothFiltered = oneFiltered.filter(v => hook.sectorContains(v)); // only those on the *arc*, not circle

        // DEV START: Logging the linear intersections and line
        // let start = new Vector(0, 0);
        // let end = new Vector(0, 0);

        // if(vel.x == 0 && vel.y !== 0) {
        //     start = new Vector(0, Graph.minY);
        //     end = new Vector(0, Graph.maxY);
        // // } else if(vel.y == 0) {
        // //     ctx.moveTo(Graph.minX, this.highRung.y);
        // //     ctx.lineTo(Graph.maxX, this.highRung.y);
        // } else if(vel.x !== 0 && vel.y !== 0) {
        //     start = new Vector(Graph.minX, vel.y * Graph.minX / vel.x + this.highRung.y);
        //     end = new Vector(Graph.maxX, vel.y * Graph.maxX / vel.x + this.highRung.y);
        // }

        // ctx.strokeStyle = "rgba(0, 255, 0, 0.5)";
        // ctx.lineWidth = Graph.scale(5);
        // ctx.lineCap = "butt";
        // ctx.lineDashOffset = -start.subtract(this.highRung).norm();
        // ctx.setLineDash([Graph.scale(10), Graph.scale(10)]);
        // ctx.beginPath();
        // ctx.moveTo(start.x, start.y);
        // ctx.lineTo(end.x, end.y);
        // ctx.stroke();
        // ctx.setLineDash([]);
        // ctx.lineCap = "round";
        // ctx.lineDashOffset = 0.0;

        // ctx.strokeStyle = "lime";
        // ctx.beginPath();
        // ctx.moveTo(this.highRung.x, this.highRung.y);
        // ctx.lineTo(this.highRung.x + vel.x, this.highRung.y + vel.y);
        // ctx.stroke();

        // ctx.fillStyle = "white";
        // ctx.beginPath();
        // for(const inter of bothFiltered) {
        //     ctx.arc(inter.x, inter.y, Graph.scale(5), 0, Util.TAU);
        // }
        // ctx.fill();
        // DEV END

        // Returning the intersections
        return bothFiltered;
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
    #willCollideYAxis(poseVel, startY = -Infinity, endY = Infinity) {
        const p = new Vector(0, startY);
        const v2 = new Vector(0, endY - startY);
        const addend2 = v2.y * p.x - v2.x * p.y;

        // Comparing each segment with the given y-axis segment
        const futureBox = this
            .#getBoundingBox()
            .map(v => v
                .add(poseVel.position)
                .subtract(this.#rotationalCenter)
                .transform(new VisualMatrix(
                    Math.cos(-poseVel.theta), -Math.sin(-poseVel.theta),
                    Math.sin(-poseVel.theta),  Math.cos(-poseVel.theta)
                ))
                .add(this.#rotationalCenter)
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

    #getCenterOfMass() {
        const rotationCenter = new Vector(this.rotCx, this.rotCy);
        return this.#centerOfMassOffset
            .add(Util.unrot(this.position.position, -this.#theta, rotationCenter))
            .subtract(rotationCenter)
            .transform(new VisualMatrix([
                Math.cos(-this.#theta), -Math.sin(-this.#theta),
                Math.sin(-this.#theta),  Math.cos(-this.#theta)
            ]))
            .add(rotationCenter)
    }

    #getArmLinearVel(deltaLength = this.#liftTicksToInches(this.#deltaLiftPos)) {
        // const linFromAng = PhysicsEntity.linearVelFrom(
        //     this.#getHookArc().center,
        //     deltaTheta,
        //     this.#rotationalCenter
        // );
        // const linFromLength = ;
        return new Vector(Math.cos(-this.#theta - this.#armTheta), Math.sin(-this.#theta - this.#armTheta))
            .scale(deltaLength);
    }

    #checkAndApplyCollision(deltaTime, state) {
        const rotCollisions = this.#findHookAngularCollisions(-state.deltaArmTheta + state.deltaTheta);

        // Checking collision between the hook and the high rung cuz of rotation
        if(rotCollisions.length !== 0) {
            this.velocity = new Pose(0, 0, 0);

            // Putting the arm and robot at the point of collision
            const thetaFromRung = rotCollisions[0] - Util.rad(90);
            const edgeTheta = Math.sign(thetaFromRung) * Math.atan(0.5 / 18);
            const t = (thetaFromRung - edgeTheta) / Math.abs(state.deltaArmTheta + state.deltaTheta); // Lerp param from edge (t=0) to end of arc (t=1)
            
            state.deltaArmTheta *= t;
            state.deltaTheta *= t;
            
            Telemetry.addLine('\n-------- Angular Collision -------\n');
            Telemetry.addData("hookCollisions", `[${rotCollisions.join(', ')}]`);
            Telemetry.addData(`thetaFromRung`,  thetaFromRung);
            Telemetry.addData(`edgeTheta`,  edgeTheta);
            Telemetry.addData(`t`,  t);
            // pause(elapsed);
        }

        // Checking collision between the hook and the high rung cuz of rotation
        const armLinearVel = this.#getArmLinearVel(state.deltaLength);
        const rungDiamAddend = armLinearVel.scale(0.5 / armLinearVel.norm());
        const lineCollisions = this.#findHookLinearCollisions(armLinearVel.add(rungDiamAddend));
        let hasArmReaction = false;
        if(lineCollisions.length !== 0) {
            hasArmReaction = true;
            console.log(PhysicsEntity.rotationalVelFrom(
                this.getLinearPos(),
                armLinearVel.scale(-1),
                this.#rotationalCenter
            ));
            state.deltaTheta += PhysicsEntity.rotationalVelFrom(
                this.getLinearPos(),
                armLinearVel/* .add(armLinearVel.scale(0.5 / armLinearVel.norm())) */.scale(-1),
                this.#rotationalCenter
            );

            // Putting the arm at the point of collision
            const distFromRung = lineCollisions[0].subtract(this.highRung).norm();
            const rungDiam = 0.5;
            const t = (distFromRung - rungDiam) / Math.abs(state.deltaLength); // Lerp param from edge (t=0) to end of vector (t=1)
            
            state.deltaLength *= t;

            Telemetry.addLine('\n----- Linear Collision ---- \n');
            Telemetry.addData("lineCollisions", `[${lineCollisions.join(', ')}]`);
            Telemetry.addData(`distFromRun`,  distFromRung);
            Telemetry.addData(`rungDiam`,  rungDiam);
            Telemetry.addData(`t`,  t);

        }

        // Checking collision between the chasis and the axes
        if(this.#willCollideXAxis(new Pose(0, 0, state.deltaTheta))) {
            this.position = this.#findXAxisCollisionPos(state.deltaTheta, 100);
            this.velocity = new Pose(0, 0, 0);
            state.deltaTheta = 0;
            if(hasArmReaction) {
                // The reaction is canceled, so the arm must remain the same length
                state.deltaLength = 0;
            }
        } else if(this.#willCollideYAxis(new Pose(0, 0, state.deltaTheta), 0, this.barrierHeight)) {
            this.position = this.#findYAxisCollisionPos(state.deltaTheta, 100, 0, this.barrierHeight);
            this.velocity = new Pose(0, 0, 0);
            state.deltaTheta = 0;
            if(hasArmReaction) {
                // The reaction is canceled, so the arm must remain the same length
                state.deltaLength = 0;
            }
        }
    }

    update(elapsed, deltaTime /* Seconds */, pause = (t) => {}) {
        
        // Updating theta
        Telemetry.addLine("\n---------- Powers ---------\n");
        Telemetry.addData("this.linearSlidePivot.getPower()", this.linearSlidePivot.getPower());
        Telemetry.addData("this.linearSlidePivot.getVelocity()", this.linearSlidePivot.getVelocity());
        Telemetry.addData("this.linearSlideLift.getPower()", this.linearSlideLift.getPower());
        Telemetry.addData("this.linearSlideLift.getVelocity()", this.linearSlideLift.getVelocity());
        Telemetry.addData("this.handLift.getPower()", this.handLift.getPower());
        // Telemetry.addData("this.handLift.getVelocity()", this.handLift.getVelocity());

        let deltaArmTheta = this.#pivotTicksToRadians(this.powerPivot(deltaTime));
        let deltaTheta = this.getAngularVel() * deltaTime; 
        let deltaLength = this.#liftTicksToInches(this.powerLift(deltaTime));
        const deltaActuate = this.#handInchesPerRev * this.actuate(deltaTime); 

        // Performing collison checks and updates
        const collisonState = { deltaArmTheta, deltaTheta, deltaLength };
        this.#checkAndApplyCollision(deltaTime, collisonState); 
        deltaArmTheta = collisonState.deltaArmTheta;
        deltaTheta = collisonState.deltaTheta;
        deltaLength = collisonState.deltaLength;

        // Updating the theta
        this.setTheta(this.getTheta() + deltaTheta);

        // Actuating the robot
        this.#unrotY += deltaActuate;

        // Setting the x and y to reflect the rotation of the robot
        this.setLinearPos(new Vector(this.unrotX, this.#unrotY)
            .subtract(this.#rotationalCenter)
            .transform(new VisualMatrix(
                Math.cos(-this.getTheta()), -Math.sin(-this.getTheta()),
                Math.sin(-this.getTheta()),  Math.cos(-this.getTheta())
            ))
            .add(this.#rotationalCenter)
        );

        // Adding gravity into the stuffs
        this.velocity.setY(this.velocity.getY() + deltaTime * PhysicsEntity.g);

        // Changing the theta velocity based on the new gravity-affected linear velocity
        this.velocity.setTheta(-PhysicsEntity.rotationalVelFrom(
            this.#getCenterOfMass(), 
            this.getLinearVel(),
            this.#rotationalCenter
        ));

        // Updating the linear velocity to accurately model the swinging motion
        this.setLinearVel(PhysicsEntity.linearVelFrom(
            this.#getCenterOfMass(),
            -this.getAngularVel(),
            this.#rotationalCenter
        ));

        // Settings the postions
        this.#x = this.getX();
        this.#y = this.getY();
        this.#theta = this.getTheta();

        // FIXME: Make this appropriate to the rotation, so that it is accurate to real life
        this.#sensor.setDistance(this.#key, DistanceUnit.INCH, this.#y);
    
        // Updating the arm stuff
        Telemetry.addLine('\n------------- Arm -------------\n');
        // Telemetry.addData("delta lift pos", Math.floor(this.#deltaLiftPos));
        Telemetry.addData("delta arm length", this.#liftTicksToInches(this.#deltaLiftPos));
        // Telemetry.addData("delta pivot pos", Math.floor(this.#radiansToPivotTicks));
        Telemetry.addData("delta arm theta (deg)", Util.deg(deltaArmTheta));

        // this.#armLength = this.#liftTicksToHookDistInches(this.linearSlideLift.getCurrentPosition());
        // this.#armLength = this.#liftTicksToHookDistInches(this.linearSlideLift.getCurrentPosition());
        this.#armLength += deltaLength;
        this.linearSlideLift._setCurrentPosition(this.#hookDistInchesToLiftTicks(this.#armLength));
        this.#armTheta += deltaArmTheta;
        this.linearSlidePivot._setCurrentPosition(this.#radiansToPivotTicks(this.#armTheta));
        this.#deltaLiftPos = 0;
        this.#deltaPivotPos = 0;
        this.#deltaHandPos = 0;

        // Telemetry.setMsTransmissionInterval(100);
        Telemetry.addData("arm length (in)", this.#armLength);
        Telemetry.addData("arm length (ticks)", Math.floor(this.linearSlideLift.getCurrentPosition()));
        Telemetry.addData("arm theta (deg)", Util.deg(this.#armTheta));
        Telemetry.addData("arm theta (ticks)", Math.floor(this.linearSlidePivot.getCurrentPosition()));

        Telemetry.addLine('\n----------- Position ----------\n');
        Telemetry.addData("x", this.#x);
        Telemetry.addData("y", this.#y);
        Telemetry.addData("theta", this.#theta);
        Telemetry.addData("deltaTheta", deltaTheta);
        Telemetry.addData("sensor reading", this.#sensor.getDistance(DistanceUnit.INCH));
        Telemetry.addData("deltaActuate", deltaActuate);

        Telemetry.addLine('\n----------- Velocity ----------\n');
        Telemetry.addData("vx", this.getLinearVel().x);
        Telemetry.addData("vy", this.getLinearVel().y);
        Telemetry.addData("angularVel", this.getAngularVel());
    }

    /**
     * 
     * @param {CanvasRenderingContext2D} ctx 
     */
    render(ctx) {
        const inverseRotX = this.#x * Math.cos(this.#theta) - (this.#y - this.rotCy) * Math.sin(this.#theta);
        const inverseRotY = this.#x * Math.sin(this.#theta) + (this.#y - this.rotCy) * Math.cos(this.#theta) + this.rotCy;
        
        // Body
        // ctx.moveTo(this.x  - this.width / 2, this.y  - this.height / 2);
        ctx.save();
        ctx.translate(this.rotCx, this.rotCy);
        ctx.rotate(-this.#theta);
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
            inverseRotX - this.#armLength * Math.cos(-this.#armTheta), 
            inverseRotY - this.#armLength * Math.sin(-this.#armTheta)
        );
        ctx.stroke();
        
        // Hook
        // ctx.lineWidth = Graph.scale(5);
        // ctx.strokeStyle = "red";
        // ctx.beginPath();
        // ctx.arc(
        //     inverseRotX - this.armLength * Math.cos(-this.armTheta) - this.hookRadius * Math.cos(-Util.rad(90) - this.armTheta),
        //     inverseRotY - this.armLength * Math.sin(-this.armTheta) - this.hookRadius * Math.sin(-Util.rad(90) - this.armTheta),
        //     this.hookRadius,
        //     -this.armTheta - Util.rad(90),
        //     -this.armTheta - Util.rad(270), 
        //     true
        // );
        // ctx.stroke();
        
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
        const com = this.#getCenterOfMass();
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
        
        // Hook, but weird
        ctx.lineWidth = Graph.scale(5);
        ctx.strokeStyle = "red";
        ctx.beginPath();
        const hook = this.#getHookArc().normalize();
        ctx.arc(hook.getX(), hook.getY(), hook.getR(), hook.startAngle, hook.endAngle, !hook.isBetween);
        ctx.stroke();
    }

    getSensor() {
        return this.#sensor;
    }

    actuate(deltaTime, power = this.handLift.getPower()) {
        const previousPower = this.handLift.getPower();
        this.handLift.setPower(power);
        this.#deltaHandPos = this.handLift._update(deltaTime);
        this.handLift.setPower(previousPower);
        return this.#deltaHandPos;
    }

    powerLift(dt, power = this.linearSlideLift.getPower()) {
        const previousPower = this.linearSlideLift.getPower();
        const oldPos = this.linearSlideLift.getCurrentPosition();
        this.linearSlideLift.setPower(power);
        this.linearSlideLift._update(dt);
        this.linearSlideLift.setPower(previousPower);

        // Clamping the length of the arm
        this.linearSlideLift
            ._setCurrentPosition(Util.clamp(0, this.linearSlideLift.getCurrentPosition(), 4000));

        return this.#deltaLiftPos = this.linearSlideLift.getCurrentPosition() - oldPos;
    }

    powerPivot(dt, power = this.linearSlidePivot.getPower()) {
        const previousPower = this.linearSlidePivot.getPower();
        const oldPos = this.linearSlidePivot.getCurrentPosition();
        this.linearSlidePivot.setPower(power);
        this.linearSlidePivot._update(dt);
        this.linearSlidePivot.setPower(previousPower);

        // Clamping the position of the pivot
        this.linearSlidePivot
            ._setCurrentPosition(Util.clamp(0, this.linearSlidePivot.getCurrentPosition(), 6000));

        // Setting the delta pos for accurate collision detection
        return this.#deltaPivotPos = this.linearSlidePivot.getCurrentPosition() - oldPos;
    }

    /**
     * Finds how far the hook is away from the pivot. In other words, this 
     * converts lift ticks to inches, with an offset to desribe the hook's 
     * position.
     * 
     * @param {number} ticks
     * @return {number} The distance the hook is away from the pivot 
     */
    #liftTicksToHookDistInches(ticks) {
        return this.#liftTicksToInches(ticks) + this.initialArmLength;
    }
    
    #hookDistInchesToLiftTicks(inches) {
        return this.#inchesToLiftTicks(inches - this.initialArmLength);
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
    #liftTicksToInches(ticks) {
        // FIXME: Test this to make sure its truly accurate to the length
        const EXTENSION_LIMIT = 42;
        const ROBOT_LENGTH = 17;
        return ticks * (EXTENSION_LIMIT - ROBOT_LENGTH) / 2500;
    }

    #inchesToLiftTicks(inches) {
        // FIXME: Test this to make sure its truly accurate to the length
        const EXTENSION_LIMIT = 42;
        const ROBOT_LENGTH = 17;
        return inches / (EXTENSION_LIMIT - ROBOT_LENGTH) * 2500;
    }

    #pivotTicksToRadians(ticks) {
        const GEARING = 28;
        const TICKS_PER_REV = 537.7;
        return ticks * (2 * Math.PI) / (GEARING * TICKS_PER_REV);
    }

    #radiansToPivotTicks(rad) {
        const GEARING = 28;
        const TICKS_PER_REV = 537.7;
        return rad / (2 * Math.PI) * (GEARING * TICKS_PER_REV);
    }
}