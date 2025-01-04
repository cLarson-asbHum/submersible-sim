import Util from "./Util.js"
import { DistanceUnit, TimeUnit } from "./Transliteration.js";


export default class AscentStabilizer {
    /*DistanceUnit*/ dUnit;
    /*TimeUnit*/ tUnit;
    /*DistanceSensor*/ sensor;

    // Mathematical constants 
    h = 36;  // How far the second rung is off the ground.
    hc = 18; // The height of the center of rotation when the robot tilts
    xc = 1;  // How far the pivot's from the rungs with no tilts
    x = this.xc;   // How far the pivot's from the rungs
    r = 1.25; // Radius of the hook.

    // Other mathematical variables
    firstUpdate = true;
    lastY = 0;
    lastT = 0;
    currentT = this.lastT;
    currentY = this.lastY;
    static #KEY = Symbol("constructor key");

    constructor(
        key,
        /*DistanceUnit*/ dUnit,
        /*TimeUnit*/ tUnit,
        /*DistanceSensor*/ sensor,
        startTimeStamp
    ) {

        if(key !== AscentStabilizer.#KEY) {
            console.warn("AscentStabilizer objects should be instanciated with the static create method.");
            throw Error("AscentStabilizer was called without passsing a valid key argument.");
        }

        this.dUnit = dUnit;
        this.tUnit = tUnit;
        this.sensor = sensor;
        this.update(startTimeStamp); // Sets the lastT/Y and currentT/Y fields

        // Converting the inches stuffs to the provided unit.
        if (!dUnit.equals(DistanceUnit.INCH)) {
            this.h = this.dUnit.fromInches(this.h);
            this.x = this.dUnit.fromInches(this.x);
            this.r = this.dUnit.fromInches(this.r);
        }
    }

    static create(/*DistanceSensor*/ sensor, startTimeStamp) {
        if(arguments.length == 2) {
            return new AscentStabilizer(this.#KEY, DistanceUnit.INCH, TimeUnit.SECONDS, sensor, startTimeStamp);
        } else if(arguments.length == 1) {
            return new AscentStabilizer(this.#KEY, DistanceUnit.INCH, TimeUnit.SECONDS, sensor, 0);
        } else {
            throw Error("AscentStabilizer.create expected 2 or 3 arguments; got " + arguments.length);
        }
    }

    /**
     * Returns how far the pivot is off the ground. To get an accurate 
     * reading, the distance sensor must be accurate to range, and the 
     * height sensor offset describes how far the sensor is above the pivot
     * (in this stabilizer's distance units). 
     * 
     * @param t Timestamp the function was called at. In the time units 
     *     given in the constructor.
     * @return How far the pivot is off the ground, in this stabilizer's 
     *     distance units.
     */
    y(t) {
        if(t == this.currentT) {
            // Same input, same output
            return this.currentY;
        }

        // New input, new ouput
        return this.sensor.getDistance(this.dUnit);
    }

    /**
     * Returns the vertical distance between the pivot and the second rung. 
     * 
     * @param t Timestamp the function was called at. In the time units 
     *     given in the constructor.
     * @return Difference between the second rung and pivot, in the object's 
     *     distance units.
     */
    deltaY(t) {
        return this.h - this.y(t);
    }

    /**
     * Returns the (discrete) derivative of the y coordinates. In other 
     * words, the slope of the the last two Ys is found over the delta time.
     * 
     * @param t Timestamp the function was called at. In the time units 
     *     given in the constructor.
     * @return Difference between the last y and the current y, divided by 
     *     difference in time between the measurements. 
     */
    yPrime(t) {
        if(this.y(t) - this.lastY == 0) {
            return 0; // Used when the denominator is 0
        }

        return (this.y(t) - this.lastY) / (t - this.lastT);
    }

    /**
     * Computes the angle at which the hook will be hooked onto the second 
     * rung.
     * 
     * @param t Timestamp the function was called at. In the time units 
     *     given in the constructor.
     * @return Desired angle of the pivot, in radians
     */
    theta(t) {
        const u = this.deltaY(t);
        const squaresSum = u * u + this.x * this.x;
        return Math.asin((-this.r * this.x + Math.abs(u) * Math.sqrt(squaresSum - this.r * this.r)) / squaresSum);
    }

    /**
     * Computes the length at which the arm will hook onto the second rung. 
     * 
     * @param t Timestamp the function was called at. In the time units 
     *     given in the constructor.
     * @return Desired length of the pivot, in the object's distance units
     */
    l(t) {
        const theta = this.theta(t);
        return this.x * Math.cos(theta) + this.deltaY(t) * Math.sin(theta);
    }

    /**
     * Computes the first derivative of the theta. This is based on the 
     * current desired theta, current height, and the height vel, not the 
     * last theta.
     * 
     * @param t Timestamp the function was called at. In the time units 
     *     given in the constructor.
     * @return First derivative of theta position at the given timestamp, in 
     *     the object's distance units per the object's time units.
     */
    thetaPrime(t) {
        const squaresSum = this.deltaY(t) * this.deltaY(t) + this.x * this.x;
        return (
            -(1 / Math.cos(this.theta(t)))
            * this.yPrime(t)
            / (squaresSum * squaresSum)
            * (
                Math.abs(this.deltaY(t)) / this.deltaY(t)
                * (
                    Math.pow(this.x, 4)
                    + this.x * this.x * (this.deltaY(t) * this.deltaY(t) - this.r * this.r)
                    + this.r * this.r * this.deltaY(t) * this.deltaY(t)
                )
                / Math.sqrt(squaresSum - this.r * this.r)
                + 2 * this.deltaY(t) * this.r * this.x
            )
        );
    }

    /**
     * Computes the first derivative of the length. This is based on the 
     * current desired theta, the theta vel, current height, and the height 
     * vel, not the last length.
     * 
     * @param t Timestamp the function was called at. In the time units 
     *     given in the constructor.
     * @return First derivative of length position at the given timestamp, 
     *     in the object's distance units per the object's time units.
     */
    lPrime(t) {
        const theta = this.theta(t);
        const sine = Math.sin(theta);
        return (
            this.thetaPrime(t) 
            * (
                this.deltaY(t) * Math.cos(theta) 
                - this.x * sine
            ) 
            - this.yPrime(t) * sine
        );
    }

    /**
     * Updates the lastT,  lastY, and pitch fields of the object. This must
     * be called everytim before other methods of the object to get accurate 
     * values. The pitch argument is used to adjust the height, which would 
     * be altered if the robot was tilting.
     * 
     * @param t Timestamp the function was called at. In the time units 
     *     given in the constructor.
     * @param pitch The angle facing downward of the robot in radians
     */
    update(t, pitch = 0) {
        // Setting the last properties for derivatives
        if(this.firstUpdate) {
            // Apply no average so that placeholder values aren't factored in
            this.lastY = this.currentY = this.y(t);
            this.lastT = this.currentT = t;
            this.firstUpdate = false;
        }

        this.lastY = /* 0.2 * this.lastY + 0.8 *  */this.currentY;
        this.lastT = /* 0.2 * this.lastT + 0.8 *  */this.currentT;

        // Setting the current properties
        this.currentY = this.y(t);
        this.currentT = t;
        // this.pitch = pitch;

        // console.log("UNROTATED: " + this.#getUnrotatedY(this.lastY, pitch));
        // this.x = this.xc * Math.cos(pitch) - (this.#getUnrotatedY(this.lastY, pitch) - this.hc) * Math.sin(pitch);
    }
}
