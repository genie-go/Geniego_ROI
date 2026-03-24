const parser = require('./node_modules/@babel/parser');

// Test the minimal pattern of what we're using
const code1 = `
function T() {
    const x = 'ai';
    return (
        <div>
            {x === 'ai' && (
                <div style={{ display: 'grid', gap: 16 }}>
                    <span>hello</span>
                </div>
            )}
        </div>
    );
}
`;

const code2 = `
function T() {
    const aiTabDisplay = 'ai' === 'ai' ? 'grid' : 'none';
    return (
        <div>
            <div style={{ display: aiTabDisplay, gap: 16 }}>
                <span>hello</span>
            </div>
        </div>
    );
}
`;

function test(label, code) {
    try {
        parser.parse(code, { sourceType: 'module', plugins: ['jsx'] });
        console.log(label + ': OK');
    } catch (e) {
        console.log(label + ': ERROR at line', e.loc && e.loc.line, '-', e.message);
    }
}

test('conditional &&', code1);
test('display variable', code2);
