import Util from "./Util.js";
import AscentStabilizer from "./AscentStabilizer.js";
import Robot from "./Robot.js";
import Graph from "./Graph.js";
import {DistanceUnit, TimeUnit, DistanceSensor} from "./Transliteration.js";

console.clear();

const canvas = document.querySelector('canvas');
const ctx = canvas.getContext('2d');
let startTime = NaN;
let lastTime = 0;

let cw, ch, cmin, hcw, hch, hcmin;

let robot = null;
let ascentStabilizer = null;

function render(elapsed, deltaTime) {
    Util.clear(ctx);
    Graph.drawAxes(ctx);
    robot.render(ctx);
}

function loop(timestamp) {
    const elapsed = (timestamp - startTime);
    const deltaTime = elapsed - lastTime;

    // Updating the robot's position data;
    robot.update(Util.seconds(elapsed), Util.seconds(deltaTime));
    render(elapsed, deltaTime);

    lastTime = elapsed;
    window.requestAnimationFrame(loop);
}

function resizeInit(timestamp) {
    if(isNaN(startTime)) { 
        startTime = timestamp;
    }

    canvas.width = cw = window.innerWidth;
    canvas.height = ch = window.innerHeight;
    cmin = Math.min(cw, ch);

    hcw = cw / 2;
    hch = ch / 2;
    hcmin = cmin / 2;

    Graph.transform(ctx);

    // Style stuff
    ctx.lineCap = "round";
    // ctx.fillStyle = "white";
    // ctx.strokeStyle = "white";
    ctx.lineWidth = Graph.scale(2);
    
    // Robot 
    if(!robot) {
        robot = new Robot();
        console.log(robot);
    }

    if(!ascentStabilizer) {
        console.log("Help?");
        ascentStabilizer = AscentStabilizer.create(robot.getSensor(), Util.seconds(timestamp), robot.heightSensorOffset);
        ascentStabilizer.hc = robot.rotCy;
        ascentStabilizer.r = robot.hookRadius;
        ascentStabilizer.xc = robot.unrotX;
        ascentStabilizer.update(Util.seconds(timestamp));
        
        // Just some quick tests
        console.log("y: ", ascentStabilizer.y());
        console.log("deltaY: ", ascentStabilizer.deltaY());
        console.log("yPrime: ", ascentStabilizer.yPrime(100));
        console.log("theta: ", ascentStabilizer.theta());
        console.log("l: ", ascentStabilizer.l());
        console.log("thetaPrime: ", ascentStabilizer.thetaPrime(100));
        console.log("lPrime: ", ascentStabilizer.lPrime(100));
    }
    // robot.x = hcw;
    // robot.y = hch;
    // robot.width = 100;
    // robot.height = 100;

    render(timestamp - startTime, timestamp - lastTime);
}

window.requestAnimationFrame(t => {
    resizeInit(t);
    loop(t);
});

window.addEventListener('resize', ({timeStamp}) => resizeInit(timeStamp));

window.addEventListener("mousemove", ({x, y}) => {
    document.querySelector("p").textContent = `(${Graph.x(x)}, ${Graph.y(y)})`;
});