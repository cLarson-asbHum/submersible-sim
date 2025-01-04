export default class Gamepad {
    left_stick_x = 0;
    left_stick_y = 0;
    right_stick_x = 0;
    right_stick_y = 0;

    dpad_up = false;
    dpad_down = false;
    dpad_left = false;
    dpad_right = false;

    a = false;
    b = false;
    x = false;
    y = false;

    start = false;
    back = false;

    left_bumper = false;
    right_bumper = false;
    left_stick_button = false;
    right_stick_button = false;

    left_trigger = 0;
    right_trigger = 0;

    constructor() {
        // Not doing a whole lot other than saying, "Please contruct me!"
    }

    reset() {
        this.left_stick_x = 0;
        this.left_stick_y = 0;
        this.right_stick_x = 0;
        this.right_stick_y = 0;

        this.dpad_up = false;
        this.dpad_down = false;
        this.dpad_left = false;
        this.dpad_right = false;

        this.a = false;
        this.b = false;
        this.x = false;
        this.y = false;

        this.start = false;
        this.back = false;

        this.left_bumper = false;
        this.right_bumper = false;
        this.left_stick_button = false;
        this.right_stick_button = false;

        this.left_trigger = 0;
        this.right_trigger = 0;
    }
}