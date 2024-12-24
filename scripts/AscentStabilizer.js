import Util from "./Util.js"
import { DistanceUnit, TimeUnit } from "./Transliteration.js";


export default class AscentStabilizer {
    /*DistanceUnit*/ dUnit;
    /*TimeUnit*/ tUnit;
    /*DistanceSensor*/ sensor;
    sensorHeight;

    // Mathematical constants 
    h = 46;  // How far the second rung is off the ground.
    hc = 18; // The height of the center of rotation when the robot tilts
    xc = 1;  // How far the pivot's from the rungs with no tilts
    x = this.xc;   // How far the pivot's from the rungs
    r = 2.5; // Radius of the hook.

    // Other mathematical variables
    lastY = 0;
    lastT = 0;
    pitch = 0;
    static #KEY = Symbol("constructor key");

    constructor(
        key,
        /*DistanceUnit*/ dUnit,
        /*TimeUnit*/ tUnit,
        /*DistanceSensor*/ sensor,
        sensorHeight,
        startTimeStamp
    ) {

        if(key !== AscentStabilizer.#KEY) {
            console.warn("AscentStabilizer objects should be instanciated with the static create method.");
            throw Error("AscentStabilizer was called without passsing a valid key argument.");
        }

        this.dUnit = dUnit;
        this.tUnit = tUnit;
        this.sensor = sensor;
        this.sensorHeight = sensorHeight;
        this.update(startTimeStamp); // Sets the lastT and lastY fields

        // Converting the inches stuffs to the provided unit.
        if (!dUnit.equals(DistanceUnit.INCH)) {
            this.h = this.dUnit.fromInches(this.h);
            this.x = this.dUnit.fromInches(this.x);
            this.r = this.dUnit.fromInches(this.r);
        }
    }

    static create(/*DistanceSensor*/ sensor, startTimeStamp, sensorHeight) {
        if(arguments.length == 3) {
            return new AscentStabilizer(this.#KEY, DistanceUnit.INCH, TimeUnit.SECONDS, sensor, sensorHeight, startTimeStamp);
        } else if(arguments.length == 2) {
            return new AscentStabilizer(this.#KEY, DistanceUnit.INCH, TimeUnit.SECONDS, sensor, sensorHeight, 0);
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
     * @return How far the pivot is off the ground, in this stabilizer's 
     *     distance units.
     */
    y() {
        return (this.sensor.getDistance(this.dUnit) - this.sensorHeight) * Math.cos(this.pitch);
    }

    /**
     * Returns the vertical distance between the pivot and the second rung. 
     * 
     * @return Difference between the second rung and pivot, in the object's 
     *     distance units.
     */
    deltaY() {
        return this.h - this.y();
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
        return (this.y() - this.lastY) / (t - this.lastT);
    }

    /**
     * Computes the angle at which the hook will be hooked onto the second 
     * rung.
     * 
     * @return Desired angle of the pivot, in radians
     */
    theta() {
        const u = this.deltaY();
        const squaresSum = u * u + this.x * this.x;
        return Math.asin((-this.r * this.x + Math.abs(u) * Math.sqrt(squaresSum - this.r * this.r)) / squaresSum);
    }

    /**
     * Computes the length at which the arm will hook onto the second rung. 
     * 
     * @return Desired length of the pivot, in the object's distance units
     */
    l() {
        const theta = this.theta();
        return this.x * Math.cos(theta) + this.deltaY();
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
        const squaresSum = this.deltaY() + this.x * this.x;
        return (
        -(1 / Math.cos(this.theta()))
            * this.yPrime(t)
            / (squaresSum * squaresSum)
            * (
                Math.abs(this.deltaY()) / this.deltaY()
                * (
                    Math.pow(this.x, 4)
                    + this.x * this.x * (this.deltaY() * this.deltaY() - this.r * this.r)
                    + this.r * this.r * this.deltaY() * this.deltaY()
                )
                + 2 * this.deltaY() * this.r * this.x
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
        const theta = this.theta();
        const sine = Math.sin(theta);
        return this.thetaPrime(t) * (this.deltaY() - this.x * sine) - this.yPrime(t) * sine;
    }


    /*
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
        this.lastT = t;
        this.pitch = pitch;
        this.lastY = this.y();
        console.log("UNROTATED: " + this.#getUnrotatedY(this.lastY, pitch));
        this.x = this.xc * Math.cos(pitch) - (this.#getUnrotatedY(this.lastY, pitch) - this.hc) * Math.sin(pitch);
    }

    #getUnrotatedY(y, pitch) {
        return (y - this.hc - this.xc * Math.sin(pitch)) / Math.cos(pitch) + this.hc;
    }
}
