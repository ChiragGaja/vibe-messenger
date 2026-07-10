require('dotenv').config();
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

async function test() {
    console.log('Testing email directly...');
    console.time('email');
    try {
        const info = await transporter.sendMail({
            from: '"Vibe" <noreply@vibe.chat>',
            to: 'chiragramesh315@gmail.com',
            subject: 'Test Email',
            text: 'Testing 123'
        });
        console.timeEnd('email');
        console.log('✅ Email sent successfully:', info.messageId);
    } catch (e) {
        console.timeEnd('email');
        console.error(e);
    }
}
test();
