/*
 * Reads JSON on stdin, evaluates the expression given as the first argument against it as `j`,
 * and prints the result. Used by ops/smoke-test.sh.
 *
 * Passing the expression as an argument rather than interpolating it into a `node -e` string is
 * what keeps quotes inside the expression from being eaten by the shell.
 *
 * Author: Khova Krishna Pilato
 */

let raw = '';

process.stdin.on('data', chunk => (raw += chunk));
process.stdin.on('end', () => {
    let j;
    try {
        j = JSON.parse(raw);
    } catch {
        console.log('<not-json>');
        return;
    }

    let value;
    try {
        value = eval(process.argv[2]);
    } catch (error) {
        console.log('<error:' + error.message + '>');
        return;
    }

    if (value === undefined || value === null) {
        console.log('');
    } else if (typeof value === 'object') {
        console.log(JSON.stringify(value));
    } else {
        console.log(String(value));
    }
});
