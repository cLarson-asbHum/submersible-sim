import Util from "./Util.js";

export default class Telemetry {
    static captionSeparator = ": ";
    static contents = "";
    static duration = Util.seconds(600);
    static lastTimestamp = -Infinity;

    static addData(caption, data) {
        this.contents += `${caption}${this.captionSeparator}${data}\n`;
    }

    static clear() {
        this.contents = "";
    }

    static update(timestamp) {
        if(timestamp - this.lastTimestamp >= this.duration) {
            console.clear();
            console.log(this.contents);
            this.lastTimestamp = timestamp;
        }

        this.clear();
    }
}