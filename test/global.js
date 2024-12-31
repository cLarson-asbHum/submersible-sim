import lodash from 'https://cdn.jsdelivr.net/npm/lodash@4.17.21/+esm';

export function expect(name, result, expected, {
    compare = lodash.isEqual,
    symbol: compareSymbol = "==",
    tablular: tabularComparison = false,
    tabularLength = 10,
    stringify = defaultStringify,
} = {}) {
    const boolean = compare(result, expected);
    const inidcator = (boolean ? " " : "X").padEnd(2, " ");
    const operand1 = tabularComparison 
        ? stringify(result).slice(0, tabularLength).padEnd(tabularLength, " ")
        : stringify(result); 
    const tabSymbol = tabularComparison 
        ? String(compareSymbol).slice(0, tabularLength).padEnd(tabularLength, " ")
        : compareSymbol 
    const comparison = `${operand1} ${tabSymbol} ${stringify(expected)}`;
    const log = boolean ? console.log : console.warn;
    log(` ${inidcator} |  ${name.padEnd(25, " ")} | ${comparison}`);
    return boolean;
}

export const notEqual = {
    compare: (a, b) => a !== b,
    symbol: "!=="
}

export const within = {
    compare: (a, b) => Math.abs(a - b) <= 1e-6,
    symbol: '~'
};

export function header(title) {
    const idealHeaderWidth = Math.max(60, title.length + 10);

    // Centering the title
    const leftPadLength = Math.ceil((idealHeaderWidth - title.length) / 2);
    const rightPadLength = idealHeaderWidth - title.length - leftPadLength;
    // console.log("l, t, r:", leftPadLength, title.length, rightPadLength);
    let middleRow = title;

    for(let i = 0; i < leftPadLength - 1; i += 2) {
        middleRow = "* " + middleRow;
    }
    
    for(let i = 0; i < rightPadLength - 1; i += 2) {
        middleRow = middleRow + " *";
    }

    // Logging the header
    console.log(`
${"=".repeat(idealHeaderWidth)}
${middleRow}
${"=".repeat(idealHeaderWidth)}
`);
}

function defaultStringify(arg) {
    if(typeof arg == 'string') {
        return `"${arg}"`; // Wrap the contenst in quotes
    }

    // Default: stringify using the stringify method, and shorten long number strings.
    return String(arg).replaceAll(/(?<=\.\d{6})\d+/g, "...");
}

// expect("good comparison", "20", "20", { symbol: "==" }); // DEV: quick test of this expect function
// expect("bad comparison", "20", "23", { symbol: "==" }); // DEV: quick test of this expect function