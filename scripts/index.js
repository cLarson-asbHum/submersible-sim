import Util from "./Util.js";
import AscentStabilizer from "./AscentStabilizer.js";
import Robot from "./Robot.js";
import Graph from "./Graph.js";
import {DistanceUnit, TimeUnit, DistanceSensor} from "./Transliteration.js";
import Telemetry from "./Telemetry.js";

console.clear();

const canvas = document.querySelector('canvas');
const ctx = canvas.getContext('2d');
let startTime = NaN;
let lastTime = 0;
let nextFrame;
let pauseStartTime;
let isPaused = false;

let cw, ch, cmin, hcw, hch, hcmin;

let robot = null;
let ascentStabilizer = null;
let speedFactor = 1.0;

function handleKey(key, deltaTime) {
    // Changing the power of other actions if shift is held
    if(key == "Shift") {
        speedFactor *= 0.5;
    }

    // Running the action
    switch(key) {
        case "ArrowUp": 
            robot.powerLift(1.0 * speedFactor, deltaTime);
            break;

        case "ArrowDown": 
            robot.powerLift(-1.0 * speedFactor, deltaTime);
            break;

        case "ArrowRight": 
            robot.powerPivot(1.0 * speedFactor, deltaTime);
            break;

        case "ArrowLeft": 
            robot.powerPivot(-1.0 * speedFactor, deltaTime);
            break;

        case "Enter":
            robot.actuate(deltaTime);

        default: 
            // Shift automatically goes here, as it is handled by the previous if
            // Do nothing
    }
}

function getKeyActionName(key) {
    switch(key) {
        case "ArrowUp": 
            return "Arm Going Up";

        case "ArrowDown": 
            return "Arm Going Down"

        case "ArrowRight": 
            return "Pivoting Right";

        case "ArrowLeft":
            return "Pivoting Left";

        case "Enter":
            return "Actuating";

        case "Shift":
            return "Slowing All Arm Actions";

        case "p":
        case " ":
            return "Pausing";

        case "u":
        case "Escape":
            return "unpausing";

        default: 
            return `Unknown Action "${key}"`;
    }
}

function render(elapsed, deltaTime) {
    Util.clear(ctx);
    Graph.drawAxes(ctx);
    robot.render(ctx);
    
    // Showing the current actions from the keys
    document.getElementById('key-actions').textContent = "";
    for(const key of heldKeys) {
        document.getElementById('key-actions').innerText += getKeyActionName(key) + "\n";
    }
}

function loop(timestamp) {
    const elapsed = Util.seconds(timestamp - startTime);
    const deltaTime = elapsed - lastTime;

    // Handling each key held
    speedFactor = 1.0;
    for(const key of heldKeys) {
        handleKey(key, deltaTime);
    }

    // Updating the robot's position data;
    robot.update(elapsed, deltaTime);
    render(elapsed, deltaTime);

    // Finishing up
    Telemetry.update(elapsed);
    lastTime = elapsed;
    nextFrame = window.requestAnimationFrame(loop);
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

function pause(t) {
    if(isPaused) {
        return;
    } 

    cancelAnimationFrame(nextFrame);
    pauseStartTime = t - startTime;
    isPaused = true;
}

function unpause(t) {
    if(!isPaused) {
        return;
    }

    startTime += t - startTime - pauseStartTime;
    nextFrame = window.requestAnimationFrame(loop);
    isPaused = false; 
}

const heldKeys = new Set();


DistanceUnit.init();

nextFrame = window.requestAnimationFrame(t => {
    resizeInit(t);
    loop(t);
});

window.addEventListener('resize', ({timeStamp}) => resizeInit(timeStamp));

window.addEventListener("mousemove", ({x, y}) => {
    document.querySelector("#mouse-pos").textContent = `(${Graph.x(x)}, ${Graph.y(y)})`;
});

window.addEventListener("keydown", event => {
    const {key} = event;
    event.preventDefault();
    heldKeys.add(key);

    if(key == "p" || key == " ") {
        pause(event.timeStamp);
    }

    if(key == "u" || key == "Escape") {
        unpause(event.timeStamp);
    }
}, {passive: false});

window.addEventListener('keyup', event => {
    const {key} = event;
    event.preventDefault();
    heldKeys.delete(key);
}, {passive: false});