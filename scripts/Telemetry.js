import Util from "./Util.js";

export default class Telemetry {
    static captionSeparator = ": ";
    static #contents = "";
    static duration = Util.seconds(600);
    static lastTimestamp = -Infinity;
    static #htmlConsole = document.querySelector('#telemetry') ?? document.createElement('pre');

    static addData(caption, data) {
        this.#contents += `${caption}${this.captionSeparator}${data}\n`;
    }

    static addLine(data = "") {
        this.#contents += data + "\n";
    }

    static setMsTransmissionInterval(ms) {
        this.duration = Util.seconds(ms);
    }

    static clear() {
        console.clear();
        this.#htmlConsole.textContent = '';
    }

    static log(data) {
        console.log(data);
        this.#htmlConsole.textContent += data;
    }

    static update(timestamp) {
        if(timestamp - this.lastTimestamp >= this.duration) {
            this.clear();
            this.log(this.#contents)
            this.lastTimestamp = timestamp;
        }

        this.#contents = ``;
    }

    static dump(t) {
        this.clear();
        this.log(this.#contents);
        this.#contents = ``;
        this.lastTimestamp = t;
    }
}