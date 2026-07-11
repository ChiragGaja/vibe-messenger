const bcrypt = require('bcrypt');

async function test() {
    console.time('bcrypt');
    await bcrypt.hash('password123', 12);
    console.timeEnd('bcrypt');
}
test();
