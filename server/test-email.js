require('dotenv').config();
const { sendOTP } = require('./src/utils/mailer');

async function test() {
    console.log('Testing email...');
    const success = await sendOTP('chiragramesh315@gmail.com', '123456');
    console.log('Success:', success);
}
test();
