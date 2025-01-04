import Util from "/scripts/Util.js";
import Telemetry from "../Telemetry.js";

export default class DcMotorEx {
    static RunMode = class RunMode {
        static RUN_USING_ENCODER = Symbol("RUN_USING_ENCODER");
        static RUN_TO_POSITION = Symbol("RUN_TO_POSITION");
    }

    #maxTickSpeed;
    #ticksPerRev;
    #velocity = 0;
    #currentPosition = 0;

    #runMode = DcMotorEx.RunMode.RUN_USING_ENCODER;
    #tolerance = 3;
    #target;
    #runToPower = 0;
    #runToFactor = 1;

    constructor(rpm, rev, pos = 0) {
        this.#ticksPerRev = rev;
        this.#maxTickSpeed = rpm / 60 * this.#ticksPerRev;
        this.#currentPosition = pos;
    }

    setMode(runMode) {
        if(runMode !== DcMotorEx.RunMode.RUN_TO_POSITION && runMode !== DcMotorEx.RunMode.RUN_USING_ENCODER) {
            throw new ReferenceError(`Cannot find runmode "${runMode}"`);
        }

        if(this.#runMode !== DcMotorEx.RunMode.RUN_TO_POSITION && runMode !== DcMotorEx.RunMode.RUN_TO_POSITION) {
            this.#velocity = 0;
            this.#runToPower = 0;
            this.#runToFactor = 1;
        }

        // this.#velocity = 0;
        this.#runMode = runMode;
    }

    getMode() {
        return this.#runMode;
    }

    setTargetPosition(target) {
        this.#target = target;
    }

    getTargetPosition() {
        return this.#target;
    }

    setPower(power) {
        if(this.#runMode !== DcMotorEx.RunMode.RUN_TO_POSITION) {
            this.#velocity = Util.clamp(-1.0, power, 1.0) * this.#maxTickSpeed;
        } else {
            Telemetry.log(power);
            this.#runToPower = Util.clamp(-1.0, power, 1.0);
            this.#velocity = this.#maxTickSpeed * this.#runToPower * this.#runToFactor;
        }   
    }

    setVelocity(vel) {
        if(this.#runMode === DcMotorEx.RunMode.RUN_USING_ENCODER) {
            this.#velocity = Util.clamp(-this.#maxTickSpeed, vel, this.#maxTickSpeed);
        }
    }

    getPower() {
        if(this.#runMode !== DcMotorEx.RunMode.RUN_TO_POSITION) {
            return this.#velocity / this.#maxTickSpeed;
        } else {
            return this.#runToPower;
        }   

    }

    getVelocity() {
        return this.#velocity;
    }

    setTargetPositionTolerance(tolerance) {
        this.#tolerance = tolerance;
    }

    getTargetPositionTolerance() {
        return this.#tolerance;
    }

    getCurrentPosition() {
        return this.#currentPosition;
    }
    
    #updateRunToVelocity() {
        // Getting the speed factor
        let reverseFactor  = 1; // Reverse at a lower speed if the target is missed.
        if((this.#target - this.#currentPosition) / this.#velocity < 0) {
            reverseFactor *= -0.5; // Put it in reverse, Ter! ...and put half the previous speed
        }

        this.#runToFactor *= reverseFactor;

        // Setting the velocity;
        this.#velocity = this.#runToPower * this.#runToFactor * this.#maxTickSpeed;
        return reverseFactor;
    }

    _update(deltaTime) {
        const delta = this.#velocity * deltaTime;
        this.#currentPosition += delta;

        // Ending run to position when within the target
        if(
            this.#runMode === DcMotorEx.RunMode.RUN_TO_POSITION
            && Math.abs(this.#currentPosition - this.#target) <= this.#tolerance
        ) {
            this.setMode(DcMotorEx.RunMode.RUN_USING_ENCODER);
        }

        // Updating the velocity if the postion is off
        if(
            this.#runMode === DcMotorEx.RunMode.RUN_TO_POSITION 
        ) {
            Telemetry.addLine("\n=-=-=-=-=-=-=-=-=-=-=-=");
            Telemetry.addLine("=-=-=-=-=-=-=-=-=-=-=-=\n");
            Telemetry.addData("runToPower", this.#runToPower);
            Telemetry.addData("old", this.#velocity);
            this.#updateRunToVelocity();
            Telemetry.addData("newVel", this.#velocity);
        } 
        return delta;
    }

    _setCurrentPosition(newPos) {
        this.#currentPosition = newPos;
    }

    // setDirection() {}
}