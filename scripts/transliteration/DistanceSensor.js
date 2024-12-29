import DistanceUnit from "./DistanceUnit.js";

export default class DistanceSensor {
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