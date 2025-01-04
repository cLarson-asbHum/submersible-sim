export default class ElapsedTime {
    static #allTimers = [];

    static _update(timestamp, deltaTime) {
        for(const timer of ElapsedTime.#allTimers) {
            if(timer.#started && !timer.#initialized) {
                timer.#lastTime = timestamp;
                timer.#initialized = true;
            }

            timer.#elapsed += timestamp - timer.#lastTime;
            timer.#lastTime = timestamp;
        }
    }
    
    #lastTime = 0;
    #elapsed = 0;
    #initialized = false;
    #started = false;

    constructor() {
        ElapsedTime.#allTimers.push(this);
    }

    start() {
        this.#started = true;
    }

    reset() {
        this.#elapsed = 0;
    }

    seconds() {
        return this.#elapsed;
    }
}