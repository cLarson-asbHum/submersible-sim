import Util from "/scripts/Util.js";

export default class DcMotorSimple {
    #maxTickSpeed;
    #ticksPerRev;
    #velocity = 0;
    #currentPosition = 0;

    constructor(rpm, rev, pos = 0) {
        this.#ticksPerRev = rev;
        this.#maxTickSpeed = rpm / 60 * this.#ticksPerRev;
        this.#currentPosition = pos;
    }

    setPower(power) {
        this.#velocity = Util.clamp(-1.0, power, 1.0) * this.#maxTickSpeed;
    }

    getPower() {
        return this.#velocity / this.#maxTickSpeed;
    }

    _update(deltaTime) {
        const deltaTick = this.#velocity * deltaTime;
        this.#currentPosition += deltaTick;
        return deltaTick;
    }

    // setDirection() {}
}