// import Util from "./Util.js"
export class DistanceUnit {
    static INCH;

    // Begin private stuffs
    static #KEY = Symbol("constructor key");
    #fromInchesFactor;

    constructor(key, fromInchesFactor) {
        if(key !== DistanceUnit.#KEY) {
            throw Error("DistanceUnit was called without passsing a valid key argument.");
        } 

        this.#fromInchesFactor = fromInchesFactor;
    }

    fromInches(inches) {
        return this.#fromInchesFactor * inches;
    }

    convertFrom(unit, distance) {
        if(unit == this) {
            return distance;
        }

        throw ReferenceError("Cannot find the given unit");
    }

    equals(obj) {
        return obj === this;
    }

    static init() {
        this.INCH =  new DistanceUnit(DistanceUnit.#KEY, 1);
    }
}

export class TimeUnit {
    static SECONDS = Symbol("seconds");
}

export class DistanceSensor {
    #distance = 0;
    #key;

    constructor(key) {
        this.#key = key;
    }

    getDistance(unit) {
        if(unit !== DistanceUnit.INCH) {
            throw ReferenceError("Cannot find given unit \"" + unit + "\"");
        }
        return unit.fromInches(this.#distance);
    }

    setDistance(key, unit, distance) {
        if(key !== this.#key) {
            throw ReferenceError("sensor.setDistance is not a function");
        }

        this.#distance = DistanceUnit.INCH.convertFrom(unit, distance);
    }
}

DistanceUnit.init();