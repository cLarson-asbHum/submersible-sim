import Util from "./Util.js";
import Robot from "./Robot.js";
import { 
    DcMotorSimple, 
    DcMotorEx, 
    DistanceSensor, 
    DistanceUnit, 
    TimeUnit, 
    Gamepad,
    ElapsedTime
} from "./Transliteration.js";
import AscentStabilizer from "./AscentStabilizer.js";
import Telemetry from "./Telemetry.js";

export default class IntoTheDeepTeleop {
    heightSensor;
    linearSlideLift;
    linearSlidePivot;
    linearActuator;

    bildaImu;
    heightGetter;
    initialArmLength;
    ascentStabilizer;

    LinearSlideStates = class {
        static NORMAL = Symbol("NORMAL");
        static RESET_ARM = Symbol("RESET_ARM");
        static MANUAL_OVERRIDE = Symbol("MANUAL_OVERRIDE");
        static STABILIZE_ROBOT = Symbol("STABILIZE_ROBOT");
        static HANG_TIME_AUTOMATIC = Symbol("AUTOMATIC_HANG_TIME");
        static HANG_TIME_AUTOMATIC_ALTERNATE = Symbol("AUTOMATIC_HANG_TIME_ALTERNATE");
        static EXIT_HANG_TIME = Symbol("EXIT_HANG_TIME");
    }
    
    linearSlideState = this.LinearSlideStates.MANUAL_OVERRIDE;
    isStateInitialized = false;

    elapsed = 0;
    gamepad2 = new Gamepad();

    // setupTimer = new ElapsedTime();
    stabilizerTimer = new ElapsedTime();
    runTime = new ElapsedTime();
    
    runTimeStarted = false; // TODO: Remove this line an all associtated references

    checkGTwoX = false;
    checkGTwoDDOWN = false;
    checkGTwoDLEFT = false;
    checkGTwoDRIGHT = false;

    constructor(robot, timestamp) {
        this.heightSensor = robot.getSensor();
        this.linearSlideLift = robot.linearSlideLift;
        this.linearSlidePivot = robot.linearSlidePivot;
        this.linearActuator = robot.handLift;

        this.initialArmLength = robot.initialArmLength;
        // this.heightGetter = { getDistance: t => this.heightSensor.getDistance() };

        // this.bildaImu = new (class GoBildaPinpointDriver)();
        // DEV START: Placeholder imu/pitch getter 
        // FIXME: This is used only because the angles are assumed to be small enough. PLEASE FIX WITH SOMETHING!
        this.bildaImu = new (class PlaceholderIMU {
            constructor() { /* Nothing here to do... */ }

            getPitch() {
                return 0;
            }
        })();
        // DEV END

        this.heightGetter = new (class HeightGetter {
            #sensor;
            #imu;

            constructor(sensor, imu) {
                this.#sensor = sensor;
                this.#imu = imu;
            }

            getDistance(unit) {
                const theta = this.#imu.getPitch();
                const rotSensorYOffset = 
                      Math.sin(-theta) * robot.heightSensorOffsetX 
                    + Math.cos(-theta) * robot.heightSensorOffsetY;
                return this.#sensor.getDistance(unit) * Math.cos(theta) - rotSensorYOffset;
            }
        })(this.heightSensor, this.bildaImu);

        // Creating the stabilizer
        this.ascentStabilizer = AscentStabilizer.create(this.heightGetter, timestamp);
        this.ascentStabilizer.h = robot.highRung.y;
        this.ascentStabilizer.hc = robot.rotCy;
        this.ascentStabilizer.x = this.ascentStabilizer.xc = robot.unrotX;
        this.ascentStabilizer.r = robot.hookRadius;
        // Telemetry.addData(robot.unrotX);
        // this.ascentStabilizer. = robot.;
    }

    _setHeldKeys(heldKeys) {
        function holding(key) {
            return heldKeys.has(key.toLowerCase());
        }

        Telemetry.addData("heldKeys", Array.from(heldKeys));
        this.gamepad2.reset();
        this.gamepad2.dpad_down = heldKeys.has('enter');   

        if(holding('w')/*  || holding('arrowup') */) {
            this.gamepad2.right_stick_y += -1.0;
        } 

        if(holding('s')/*  || holding('arrowdown') */) {
            this.gamepad2.right_stick_y += 1.0;
        }

        if(holding('a')/*  || holding('arrowleft') */) {
            this.gamepad2.left_stick_y += -1.0;
        }

        if(holding('d')/*  || holding('arrowright') */) {
            this.gamepad2.left_stick_y += 1.0;
        }

        if(holding('arrowleft')) {
            this.gamepad2.dpad_left = true;
        }

        if(holding('arrowright')) {
            this.gamepad2.dpad_right = true;
        }

        if(holding('arrowup')) {
            this.gamepad2.dpad_up = true;
        }

        if(holding('arrowdown')) {
            this.gamepad2.dpad_down = true;
        }

        if(holding('m')) {
            this.gamepad2.dpad_down = true;
            this.gamepad2.a = true;
        }

        if(holding('r')) {
            this.gamepad2.dpad_right = true;
            this.gamepad2.x = true;
        }

        let speedFactor = 1;
        if(holding("shift")) {
            speedFactor *= 0.5;
        }

        if(holding("\"")) {
            speedFactor *= 0.5;
        }
        
        this.gamepad2.right_stick_y *= speedFactor;
        this.gamepad2.left_stick_y *= speedFactor;  
    }

    _update(elapsed) {
        this.elapsed = elapsed;
        this.runOpMode();
        // this.
    }

    runOpMode() {
        // DEV START: Transliteration intro
        if(!this.runTimeStarted) {
            this.runTime.start();
            this.runTimeStarted = true;
        }

        // const telemetry = Telemetry;
        const gamepad2 = this.gamepad2;
        const ascentStabilizer = this.ascentStabilizer;
        
        let isStateInitialized = this.isStateInitialized;
        let linearSlideState = this.linearSlideState;
        const LinearSlideStates = this.LinearSlideStates;
        
        // const heightSensor = this.heightSensor;
        const linearSlidePivot = this.linearSlidePivot;
        const linearSlideLift = this.linearSlideLift;
        const linearActuator = this.linearActuator;

        let checkGTwoX = this.checkGTwoDDOWN;
        let checkGTwoDDOWN = this.checkGTwoDDOWN;
        let checkGTwoDLEFT = this.checkGTwoDLEFT;
        let checkGTwoDRIGHT = this.checkGTwoDRIGHT;
        const DRAW_BACK = ascentStabilizer.r;
        // DEV END

        linearActuator.setPower(0);
        linearSlideLift.setPower(0);
        linearSlidePivot.setPower(0);

        // LINEAR SLIDE STATE MACHINE
        switch(linearSlideState) {
            case LinearSlideStates.RESET_ARM:
                if(!isStateInitialized) {
                    linearSlidePivot.setTargetPosition(0);
                    linearSlidePivot.setMode(DcMotorEx.RunMode.RUN_TO_POSITION);
                    linearSlidePivot.setPower(-1.0);
                    linearSlidePivot.setTargetPosition(0);
                    linearSlideLift.setMode(DcMotorEx.RunMode.RUN_TO_POSITION);
                    linearSlideLift.setPower(-1.0);
                    isStateInitialized = true;
                }

                linearSlidePivot.setPower(-1.0);
                linearSlideLift.setPower(-1.0);

                // EXIT 
                if(
                    Math.abs(linearSlideLift.getCurrentPosition()) <= 3
                    && Math.abs(linearSlidePivot.getCurrentPosition()) <= 3
                ) {
                    linearSlidePivot.setMode(DcMotorEx.RunMode.RUN_USING_ENCODER);
                    linearSlidePivot.setPower(0);
                    linearSlideLift.setMode(DcMotorEx.RunMode.RUN_USING_ENCODER);
                    linearSlideLift.setPower(0);
                    isStateInitialized = false;
                    linearSlideState = LinearSlideStates.NORMAL;
                }
                break;

            case LinearSlideStates.NORMAL: 
                if(!isStateInitialized) {
                    isStateInitialized = true;
                }

                // The arm is at intake or deposit; can only alter the extension
                linearSlideLift.setPower(-gamepad2.right_stick_y);

                // EXIT
                if(gamepad2.dpad_down && gamepad2.a && !checkGTwoDDOWN) {
                    checkGTwoDDOWN = true;
                    isStateInitialized = false;
                    linearSlideState = LinearSlideStates.MANUAL_OVERRIDE;
                }

                if(gamepad2.dpad_left && !checkGTwoDLEFT) {
                    checkGTwoDLEFT = true;
                    isStateInitialized = false;
                    linearSlideState = LinearSlideStates.STABILIZE_ROBOT;
                }
                break;

            case LinearSlideStates.MANUAL_OVERRIDE: 
                if(!isStateInitialized) {
                    isStateInitialized = true;
                }

                linearSlideLift.setPower(-gamepad2.right_stick_y);
                linearSlidePivot.setPower(gamepad2.left_stick_y);
                
                // EXIT
                if(gamepad2.dpad_down && gamepad2.a && !checkGTwoDDOWN) {
                    linearSlideState = LinearSlideStates.NORMAL;
                    checkGTwoDDOWN = true;
                }

                if(gamepad2.dpad_left && !checkGTwoDLEFT) {
                    checkGTwoDLEFT = true;
                    isStateInitialized = false;
                    linearSlideState = LinearSlideStates.STABILIZE_ROBOT;
                }
                break;

            case LinearSlideStates.STABILIZE_ROBOT: {
                // Put the robot into a vertical position with the arm at the ready
                const t = this.stabilizerTimer.seconds();
                
                ascentStabilizer.update(t);

                const desiredArmTheta = ascentStabilizer.theta(t);
                const desiredArmLength = ascentStabilizer.l(t) - ascentStabilizer.r * DRAW_BACK;
                const currentArmTheta = this.pivotTicksToRadians(linearSlidePivot.getCurrentPosition());
                const currentArmLength = this.liftTicksToHookDistInches(linearSlideLift.getCurrentPosition());

                if(!isStateInitialized) {
                    this.stabilizerTimer.reset();
                    linearSlideLift.setTargetPosition(this.hookDistInchesToLiftTicks(desiredArmLength));
                    linearSlideLift.setMode(DcMotorEx.RunMode.RUN_TO_POSITION);
                    linearSlideLift.setPower(1.0);
                    linearSlidePivot.setTargetPosition(this.radiansToPivotTicks(desiredArmTheta));
                    isStateInitialized = true;
                }

                linearSlideLift.setPower(-gamepad2.right_stick_y);
                linearSlidePivot.setPower(gamepad2.left_stick_y);

                // Moving the arm into position
                let isCorrectLength = true;
                let isCorrectTheta = true;

                if(Math.abs(linearSlideLift.getCurrentPosition() - linearSlideLift.getTargetPosition()) > 10) {
                    linearSlideLift.setMode(DcMotorEx.RunMode.RUN_TO_POSITION); // NOTE: May be optional for-- or impeding on-- Java
                    linearSlideLift.setPower(1.0);
                    isCorrectLength = false;
                }
                
                if(Math.abs(linearSlidePivot.getCurrentPosition() - linearSlidePivot.getTargetPosition()) > 3) {
                    this.runPivotToPositionIndividual(
                        linearSlidePivot.getCurrentPosition(), 
                        /* linearSlidePivot.getCurrentPosition(), */
                        this.radiansToPivotTicks(desiredArmTheta), 
                        1.0
                    );
                    isCorrectTheta = false;
                }

                Telemetry.addLine('\n----- Stabilize Robot -----\n');
                Telemetry.addData("t", t);
                Telemetry.addData("y", ascentStabilizer.y(t));
                Telemetry.addData("deltaY", ascentStabilizer.deltaY(t));
                Telemetry.addData("desiredArmTheta", desiredArmTheta);
                Telemetry.addData("desiredArmLength", desiredArmLength);

                Telemetry.addLine("");
                Telemetry.addData("current armTheta", currentArmTheta);
                Telemetry.addData("current length", currentArmLength);

                // EXIT
                if((isCorrectLength && isCorrectTheta) || (gamepad2.dpad_left && !checkGTwoDLEFT)) {
                    if(gamepad2.dpad_left) {
                        checkGTwoDLEFT = true;
                    }

                    linearSlideLift.setMode(DcMotorEx.RunMode.RUN_USING_ENCODER);
                    linearSlideLift.setPower(0);
                    linearSlidePivot.setMode(DcMotorEx.RunMode.RUN_USING_ENCODER);
                    linearSlidePivot.setPower(0);
                    isStateInitialized = false;
                    linearSlideState = LinearSlideStates.HANG_TIME_AUTOMATIC;
                }

                // ABORT
                if(gamepad2.dpad_right && !checkGTwoDRIGHT) {
                    linearSlideLift.setMode(DcMotorEx.RunMode.RUN_USING_ENCODER);
                    linearSlideLift.setPower(0);
                    linearSlidePivot.setMode(DcMotorEx.RunMode.RUN_USING_ENCODER);
                    linearSlidePivot.setPower(0);
                    checkGTwoDRIGHT = true;
                    isStateInitialized = false;
                    linearSlideState = LinearSlideStates.EXIT_HANG_TIME;
                }
                break;
            }

            case LinearSlideStates.HANG_TIME_AUTOMATIC: {
                // Vertically raising the robot for the first portion of a 3rd level ascent
                //
                // This sets the velocities of the motors based on first derivatives; this may, 
                // therefore, become misaligned. To fix in that scenario, just hit the right dpad
                // to enter re-stabilization
                const t = this.stabilizerTimer.seconds();
                
                ascentStabilizer.update(t);

                const desiredArmTheta = ascentStabilizer.theta(t);
                const desiredArmLength = ascentStabilizer.l(t) - ascentStabilizer.r * DRAW_BACK;
                const thetaPrime = ascentStabilizer.thetaPrime(t);
                const lengthPrime = ascentStabilizer.lPrime(t);
                const currentArmTheta = this.pivotTicksToRadians(linearSlidePivot.getCurrentPosition());
                const currentArmLength = this.liftTicksToHookDistInches(linearSlideLift.getCurrentPosition());

                // Raise the robot vertically to 3rd level!
                if(!isStateInitialized) {
                    this.stabilizerTimer.reset();
                    ascentStabilizer.firstUpdate = true;
                    ascentStabilizer.update(t);
                    isStateInitialized = true;
                }

                linearSlideLift.setMode(DcMotorEx.RunMode.RUN_USING_ENCODER);
                linearSlideLift.setVelocity(this.inchesToLiftTicks(lengthPrime));
                linearSlidePivot.setMode(DcMotorEx.RunMode.RUN_USING_ENCODER);
                linearSlidePivot.setVelocity(this.radiansToPivotTicks(thetaPrime));

                Telemetry.addLine('\n--- Automatic Hang Time ---\n');
                Telemetry.addData("t", t);
                Telemetry.addData("y", ascentStabilizer.y(t));
                Telemetry.addData("deltaY", ascentStabilizer.deltaY(t));
                Telemetry.addData("desiredArmTheta", desiredArmTheta);
                Telemetry.addData("desiredArmLength", desiredArmLength);
                
                Telemetry.addLine("");
                Telemetry.addData("deltaY", ascentStabilizer.deltaY(t));
                Telemetry.addData("yPrime", ascentStabilizer.yPrime(t));
                Telemetry.addData("lengthPrime", lengthPrime);
                Telemetry.addData("thetaPrime", thetaPrime);

                Telemetry.addLine("");
                Telemetry.addData("current armTheta", currentArmTheta);
                Telemetry.addData("current length", currentArmLength);

                // EXIT
                if(gamepad2.dpad_left && !checkGTwoDLEFT) {
                    checkGTwoDLEFT = true;
                    linearSlideLift.setMode(DcMotorEx.RunMode.RUN_USING_ENCODER);
                    linearSlideLift.setPower(0);
                    linearSlidePivot.setMode(DcMotorEx.RunMode.RUN_USING_ENCODER);
                    linearSlidePivot.setPower(0);
                    isStateInitialized = false;
                    linearSlideState = LinearSlideStates.EXIT_HANG_TIME;
                }

                if(gamepad2.dpad_right && !checkGTwoDRIGHT) {
                    checkGTwoDRIGHT = true;
                    linearSlideLift.setMode(DcMotorEx.RunMode.RUN_USING_ENCODER);
                    linearSlideLift.setPower(0);
                    linearSlidePivot.setMode(DcMotorEx.RunMode.RUN_USING_ENCODER);
                    linearSlidePivot.setPower(0);
                    isStateInitialized = false;
                    linearSlideState = LinearSlideStates.STABILIZE_ROBOT;
                }

                break;
            }
            
            case LinearSlideStates.HANG_TIME_AUTOMATIC_ALTERNATE: {
                // Vertically raising the robot for the first portion of a 3rd level ascent
                //
                // This uses RUN_TO_POSITION to maintain the position of the motors; this may,
                // however, overpull the robot due to the velocities being not maintained. You 
                // can attempt to restabilize the robot by hitting the right dpad button, the effect
                // might be lackluster
                const t = this.stabilizerTimer.seconds();
                
                ascentStabilizer.update(t);
                
                // Raise the robot vertically to 3rd level!
                if(!isStateInitialized) {
                    this.stabilizerTimer.reset();
                    ascentStabilizer.firstUpdate = true;
                    ascentStabilizer.update(t);
                    isStateInitialized = true;
                }

                const desiredArmTheta = ascentStabilizer.theta(t);
                const desiredArmLength = ascentStabilizer.l(t) - DRAW_BACK;

                linearSlideLift.setTargetPosition(this.hookDistInchesToLiftTicks(desiredArmLength));
                linearSlideLift.setMode(DcMotorEx.RunMode.RUN_TO_POSITION);
                linearSlideLift.setPower(1.0);

                this.runPivotToPositionIndividual(
                    linearSlidePivot.getCurrentPosition(), 
                    /* linearSlidePivot.getCurrentPosition(), */
                    this.radiansToPivotTicks(desiredArmTheta), 
                    1.0
                );

                Telemetry.addLine('\n--- Automatic Hang Time (Alternate ~ Position) ---\n');
                Telemetry.addData("t", t);
                Telemetry.addData("y", ascentStabilizer.y(t));
                Telemetry.addData("deltaY", ascentStabilizer.deltaY(t));
                Telemetry.addData("desiredArmTheta", desiredArmTheta);
                Telemetry.addData("desiredArmLength", desiredArmLength);
                Telemetry.addData("currentArmLift", this.liftTicksToHookDistInches(this.linearSlideLift.getCurrentPosition()));
                Telemetry.addData("currentArmTheta", this.pivotTicksToRadians(this.linearSlidePivot.getCurrentPosition()));

                // EXIT
                if(gamepad2.dpad_left && !checkGTwoDLEFT) {
                    checkGTwoDLEFT = true;
                    linearSlideLift.setMode(DcMotorEx.RunMode.RUN_USING_ENCODER);
                    linearSlideLift.setPower(0);
                    linearSlidePivot.setMode(DcMotorEx.RunMode.RUN_USING_ENCODER);
                    linearSlidePivot.setPower(0);
                    isStateInitialized = false;
                    linearSlideState = LinearSlideStates.EXIT_HANG_TIME;
                }

                if(gamepad2.dpad_right && !checkGTwoDRIGHT) {
                    checkGTwoDRIGHT = true;
                    linearSlideLift.setMode(DcMotorEx.RunMode.RUN_USING_ENCODER);
                    linearSlideLift.setPower(0);
                    linearSlidePivot.setMode(DcMotorEx.RunMode.RUN_USING_ENCODER);
                    linearSlidePivot.setPower(0);
                    isStateInitialized = false;
                    linearSlideState = LinearSlideStates.STABILIZE_ROBOT;
                }
                break;
            }

            case LinearSlideStates.EXIT_HANG_TIME: 
                // Put the robot into a safer state before going to normal state
                // NOTE: This doesn't do much other than just change to normal state...
                if(!isStateInitialized) {
                    isStateInitialized = true;
                }

                // EXIT
                isStateInitialized = false;
                linearSlideState = LinearSlideStates.NORMAL;

                // ABORT

                break;

            default: 
                throw new TypeError(`No slide state found (given <${linearSlideState}>)`);
        }

        if (gamepad2.dpad_down) {
            // lower actuators manually to reset in case of malfunction
            linearActuator.setPower(-1.0);
            // this.setupTimer.reset();
        }

        if(gamepad2.dpad_right && gamepad2.x && (!checkGTwoDRIGHT || !checkGTwoX)) {
            checkGTwoDLEFT = true;
            checkGTwoX = true;
            isStateInitialized = false;
            linearSlideState = LinearSlideStates.RESET_ARM;
        }

        Telemetry.addLine("\n---------- Teleop ---------\n");
        Telemetry.addData("Run Time", this.runTime.seconds());
        Telemetry.addData("State", String(linearSlideState));

        // DEV START: Transliteration finale
        this.linearSlideState = linearSlideState;
        this.checkGTwoDDOWN = gamepad2.dpad_down;
        this.checkGTwoDLEFT = gamepad2.dpad_left;
        this.checkGTwoDRIGHT = gamepad2.dpad_right;
        this.checkGTwoX = gamepad2.x;
        this.isStateInitialized = isStateInitialized;
        // DEV END
    }

    runPivotToPositionIndividual(currentPosR, /* currentPosL, */ target, speedFactor) {
        this.linearSlidePivot.setTargetPosition(target);
        this.linearSlidePivot.setMode(DcMotorEx.RunMode.RUN_TO_POSITION);
        this.linearSlidePivot.setPower(speedFactor);
    }

    liftTicksToInches(ticks) {
        // FIXME: Test this to make sure its truly accurate to the length
        const EXTENSION_LIMIT = 42;
        const ROBOT_LENGTH = 17;
        return ticks * (EXTENSION_LIMIT - ROBOT_LENGTH) / 2500;
    }

    inchesToLiftTicks(inches) {
        // FIXME: Test this to make sure its truly accurate to the length
        const EXTENSION_LIMIT = 42;
        const ROBOT_LENGTH = 17;
        return inches / (EXTENSION_LIMIT - ROBOT_LENGTH) * 2500;
    }

    pivotTicksToRadians(ticks) {
        const GEARING = 28;
        const TICKS_PER_REV = 537.7;
        return ticks * (2 * Math.PI) / (GEARING * TICKS_PER_REV);
    }

    radiansToPivotTicks(rad) {
        const GEARING = 28;
        const TICKS_PER_REV = 537.7;
        return rad / (2 * Math.PI) * (GEARING * TICKS_PER_REV);
    }
    
    
    /**
     * Finds how far the hook is away from the pivot. In other words, this 
     * converts lift ticks to inches, with an offset to desribe the hook's 
     * position.
     * 
     * @param ticks
     * @return The distance the hook is away from the pivot 
     */
    liftTicksToHookDistInches(ticks) {
        return this.liftTicksToInches(ticks) + this.initialArmLength;
    }

    hookDistInchesToLiftTicks(inches) {
        return this.inchesToLiftTicks(inches - this.initialArmLength);
    }
}