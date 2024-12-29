export default class DistanceUnit {
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