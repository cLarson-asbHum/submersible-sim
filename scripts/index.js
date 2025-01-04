import Util from "./Util.js";
import AscentStabilizer from "./AscentStabilizer.js";
import Robot from "./Robot.js";
import Graph from "./Graph.js";
import {DistanceUnit, TimeUnit, DistanceSensor, ElapsedTime, } from "./Transliteration.js";
import Telemetry from "./Telemetry.js";
import IntoTheDeepTeleop from "./IntoTheDeepTeleop.js";

console.clear();

const canvas = document.querySelector('canvas');
const ctx = canvas.getContext('2d');
let startTime = NaN;
let lastTime = 0;
let nextFrame;
let pauseStartTime = 0;
let isPaused = false;

let cw, ch, cmin, hcw, hch, hcmin;

let robot = null;
let ascentStabilizer = null;
let teleop = null;

function handleKey(key, deltaTime) {
    // Changing the power of other actions if shift is held
    if(key.toLowerCase() == "Shift".toLowerCase() || key=="\"") {
        speedFactor *= 0.5;
    }

    // Running the action
    switch(key.toLowerCase()) {
        case "w":
        case "ArrowUp".toLowerCase(): 
            robot.powerLift(1.0 * speedFactor, deltaTime);
            break;

        case "s":    
        case "ArrowDown".toLowerCase(): 
            robot.powerLift(-1.0 * speedFactor, deltaTime);
            break;

        case "d":    
        case "ArrowRight".toLowerCase(): 
            robot.powerPivot(1.0 * speedFactor, deltaTime);
            break;

        case "a":    
        case "ArrowLeft".toLowerCase(): 
            robot.powerPivot(-1.0 * speedFactor, deltaTime);
            break;

        case "Enter".toLowerCase():
            robot.actuate(deltaTime);

        default: 
            // Shift automatically goes here, as it is handled by the previous if
            // Do nothing
    }
}

function getKeyActionName(key, pausedWhenPressed = isPaused) {
    switch(key.toLowerCase()) {
        case "w":
        case "ArrowUp".toLowerCase(): 
            return "Arm Going Up";

        case "s":
        case "ArrowDown".toLowerCase(): 
            return "Arm Going Down"

        case "d":
        case "ArrowRight".toLowerCase(): 
            return "Pivoting Right";

        case "a":
        case "ArrowLeft".toLowerCase():
            return "Pivoting Left";

        case "Enter".toLowerCase():
            return "Actuating";
 
        // case "'":
        case '"':
        case "Shift".toLowerCase():
            return "Slowing All Arm Actions";

        case "p":
            return "Paused";

        case " ": {
            let actionName = "Paused";
            if(pausedWhenPressed) {
                actionName = "Unpausing";
            }
            return actionName;
        }

        case "!":
            return "Debugging...";

        case "u":
        case "Escape".toLowerCase():
            return "Unpausing";

        default: 
            return `Unknown Action "${key}"`;
    }
}

function displayHeldKeys(pausedWhenPressed = isPaused) {
    document.getElementById('key-actions').textContent = "";
    for(const key of heldKeys) {
        document.getElementById('key-actions').innerText += getKeyActionName(key, pausedWhenPressed) + "\n";
    }
}

function render(elapsed, deltaTime) {
    // Util.clear(ctx);
    Graph.drawAxes(ctx);
    robot.render(ctx);
    
    // Showing the current actions from the keys
    displayHeldKeys(isPaused);
}


let lastSecond = 0;
let frames = 0;

function loop(timestamp) {
    const FRAME = 1/60;
    const deltaTime = Math.min(Util.seconds(timestamp - startTime) - lastTime, FRAME);
    const elapsed = lastTime + deltaTime;
    // const FRAME = 1/60;
    // const elapsed = Util.seconds(timestamp - startTime);
    // const deltaTime = ◘FRAME;
    // const elapsed = lastTime + FRAME;
    // const deltaTime = elapsed - lastTime;
    Telemetry.addData("<deltaTime>", deltaTime);

    // Running the teleop logic
    ElapsedTime._update(elapsed);
    teleop._setHeldKeys(heldKeys);
    teleop._update(elapsed);

    // Updating the robot's position data;
    Util.clear(ctx);
    robot.update(elapsed, deltaTime, pause);
    render(elapsed, deltaTime);

    // Finishing up
    frames++;
    if(elapsed - lastSecond >= 1) {
        console.log('fps: ', frames);
        frames = 0;
        lastSecond += 1;
    }

    debugHere();
    
    Telemetry.setMsTransmissionInterval(200);
    Telemetry.update(elapsed);
    lastTime = elapsed;
    if(!isPaused) {
        nextFrame = window.requestAnimationFrame(loop);
    }
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

    // if(!ascentStabilizer) {
    //     console.log("Help?");
    //     ascentStabilizer = AscentStabilizer.create(robot.getSensor(), Util.seconds(timestamp), robot.heightSensorOffset);
    //     ascentStabilizer.hc = robot.rotCy;
    //     ascentStabilizer.r = robot.hookRadius;
    //     ascentStabilizer.xc = robot.unrotX;
    //     ascentStabilizer.update(Util.seconds(timestamp));
        
    //     // Just some quick tests
    //     console.log("y: ", ascentStabilizer.y());
    //     console.log("deltaY: ", ascentStabilizer.deltaY());
    //     console.log("yPrime: ", ascentStabilizer.yPrime(100));
    //     console.log("theta: ", ascentStabilizer.theta());
    //     console.log("l: ", ascentStabilizer.l());
    //     console.log("thetaPrime: ", ascentStabilizer.thetaPrime(100));
    //     console.log("lPrime: ", ascentStabilizer.lPrime(100));
    // }

    if(!teleop) {
        teleop = new IntoTheDeepTeleop(robot, timestamp - startTime);
    }

    render(timestamp - startTime, timestamp - lastTime);
}

function pause(t) {
    if(isPaused) {
        return;
    } 

    // Telemetry.dump(t - startTime);
    render(t - startTime, t - startTime - lastTime);
    cancelAnimationFrame(nextFrame);
    pauseStartTime = t - startTime;
    isPaused = true;
}

function unpause(t) {
    if(!isPaused) {
        return;
    }

    startTime += t - startTime - pauseStartTime;
    isPaused = false; 
    nextFrame = window.requestAnimationFrame(loop);
}

// DEV START 
// FIXME: DO. NOT. LEAVE. THIS. IN. Remove it for prod!
let debugsRemaining = 0;

function enterDebug(debugDepth = 1) {
    debugsRemaining += debugDepth;
}

function debugHere() {
    if(debugsRemaining > 0) {
        debugsRemaining--;
        debugger;
    }
}
// DEV END

const heldKeys = new Set();


DistanceUnit.init();


nextFrame = window.requestAnimationFrame(t => {
    resizeInit(t);
    window.dispatchEvent(new KeyboardEvent("keydown", {
        key: 'p',
        timeStamp: t
    }));
    loop(t);
    window.dispatchEvent(new KeyboardEvent("keyup", {
        key: 'p',
        timeStamp: t
    }));
});

window.addEventListener('resize', ({timeStamp}) => resizeInit(timeStamp));

window.addEventListener("mousemove", ({x, y}) => {
    document.querySelector("#mouse-pos").textContent = `(${Graph.x(x)}, ${Graph.y(y)})`;
});

window.addEventListener("keydown", event => {
    const {key} = event;
    // event.preventDefault();
    heldKeys.add(key.toLowerCase());

    if(key.toLowerCase() == "p" || (key.toLowerCase() == " " && !isPaused)) {
        pause(event.timeStamp);
        return; // Prevent fallthrough to the next if (if any)
    }

    if(key.toLowerCase() == "u" || key.toLowerCase() == "escape" || (key == " " && isPaused)) {
        unpause(event.timeStamp);
        return; // Prevent fallthrough to the next if (if any)
    }

    // DEV START: FIXME: This is dumb debugging stuff!
    if(key.toLowerCase() == "!") {
        enterDebug();
        return;
    }
    // DEV
}, {passive: false});

window.addEventListener('keyup', event => {
    const {key} = event;
    event.preventDefault();

    
    if(key == "\"" || key == "'") {
        heldKeys.delete("\"");
        heldKeys.delete("'");
        return ;
    }

    heldKeys.delete(key.toLowerCase());
}, {passive: false});

document.addEventListener('visibilitychange', event => {
    const {timeStamp: t} = event;
    window.dispatchEvent(new KeyboardEvent("keydown", {
        key: 'p',
        timeStamp: t
    }));
    loop(t);
    window.dispatchEvent(new KeyboardEvent("keyup", {
        key: 'p',
        timeStamp: t
    }));
}, {passive: true});