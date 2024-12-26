export default class VisualMatrix extends DOMMatrixReadOnly {
    constructor(...args) {
        // Determing wether this is used like a true rest args or is a single array 
        let init;

        if(args.length === 1 && args[0] instanceof Array) {
            // The input has only one input that is an array;
            // treat it like an array
            init = args[0];
        } else {
            // The input is either multi-arugmented or is simply not an array;
            // treat it like a rest argument
            init = args;
        }

        // Constructing based on the arguments
        if(init?.length == 0) {
            super();
        } else if(init?.length == 4) {
            super([init[0], init[2], init[1], init[3], 0, 0]);
        } else if(init?.length == 6) {
            super([init[0], init[2], init[1], init[3], init[4], init[5]]);
        } else if(init?.length == 9) {
            super([init[0], init[3], init[1], init[4], init[2], init[5]]);
        } else {
            throw new TypeError(`VisualMatrix init expect 0, 4, 6, or 9 elements; got ${init?.length}`);
        } 
    }
}