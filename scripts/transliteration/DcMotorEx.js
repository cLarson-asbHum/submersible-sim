import Util from "/scripts/Util.js";

export default class DcMotorEx {
    #maxTickSpeed;
    #ticksPerRev;
    #velocity;
    #currentPosition = 0;

    constructor(rpm, rev, pos = 0) {
        this.#ticksPerRev = rev;
        this.#maxTickSpeed = rpm / 60 * this.#ticksPerRev;
        this.#currentPosition = pos;
    }

    setPower(power) {
        this.#velocity = Util.clamp(-1.0, power, 1.0) * this.#maxTickSpeed;
    }

    setVelocity(vel) {
        this.#velocity = Util.clamp(-this.#maxTickSpeed, vel, this.#maxTickSpeed);
    }

    getPower() {
        return this.#velocity / this.#maxTickSpeed;
    }

    getVelocity() {
        return this.#velocity;
    }

    getCurrentPosition() {
        return this.#currentPosition;
    }

    _update(deltaTime) {
        this.#currentPosition += this.#velocity * deltaTime;
    }

    _setCurrentPosition(newPos) {
        this.#currentPosition = newPos;
    }

    // setDirection() {}
}