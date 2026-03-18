const nodemailer = require('nodemailer');

// This mailer uses Gmail via environment variables.
// To use this, you MUST have an App Password generated for the Gmail account.

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

const sendOTP = async (email, otp) => {
    const mailOptions = {
        from: '"Vibe" <noreply@vibe.chat>',
        to: email,
        subject: 'Welcome to Vibe! Verify Your Email',
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Welcome to Vibe!</title>
                <style>
                    body {
                        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                        line-height: 1.6;
                        color: #e2e8f0;
                        background-color: #0f0f14;
                        margin: 0;
                        padding: 0;
                        -webkit-font-smoothing: antialiased;
                    }
                    .container {
                        max-width: 520px;
                        margin: 40px auto;
                        background: #1a1a24;
                        border-radius: 20px;
                        border: 1px solid rgba(99, 102, 241, 0.15);
                        overflow: hidden;
                    }
                    .header {
                        background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%);
                        padding: 40px 40px 36px;
                        text-align: center;
                    }
                    .logo-text {
                        font-size: 28px;
                        font-weight: 800;
                        color: #ffffff;
                        letter-spacing: -0.03em;
                        margin: 0 0 6px 0;
                    }
                    .header-sub {
                        font-size: 14px;
                        color: rgba(255,255,255,0.85);
                        margin: 0;
                        font-weight: 400;
                    }
                    .content {
                        padding: 36px 40px 40px;
                    }
                    .greeting {
                        font-size: 22px;
                        font-weight: 700;
                        color: #f1f5f9;
                        margin: 0 0 12px 0;
                    }
                    .body-text {
                        font-size: 15px;
                        color: #94a3b8;
                        margin: 0 0 8px 0;
                        line-height: 1.7;
                    }
                    .otp-container {
                        background: linear-gradient(135deg, rgba(99,102,241,0.1) 0%, rgba(139,92,246,0.1) 100%);
                        border: 1px solid rgba(99,102,241,0.25);
                        border-radius: 16px;
                        padding: 28px;
                        text-align: center;
                        margin: 28px 0;
                    }
                    .otp-label {
                        font-size: 11px;
                        text-transform: uppercase;
                        letter-spacing: 0.15em;
                        color: #818cf8;
                        font-weight: 600;
                        margin: 0 0 12px 0;
                    }
                    .otp-code {
                        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
                        font-size: 40px;
                        font-weight: 800;
                        letter-spacing: 0.3em;
                        color: #ffffff;
                        margin: 0;
                    }
                    .otp-timer {
                        font-size: 12px;
                        color: #64748b;
                        margin: 14px 0 0 0;
                    }
                    .otp-timer strong {
                        color: #f59e0b;
                    }
                    .divider {
                        height: 1px;
                        background: rgba(99,102,241,0.12);
                        margin: 28px 0;
                    }
                    .tip-box {
                        background: rgba(16,185,129,0.08);
                        border: 1px solid rgba(16,185,129,0.15);
                        border-radius: 12px;
                        padding: 16px 20px;
                        margin: 0 0 24px 0;
                    }
                    .tip-text {
                        font-size: 13px;
                        color: #6ee7b7;
                        margin: 0;
                        line-height: 1.6;
                    }
                    .ignore-text {
                        font-size: 13px;
                        color: #475569;
                        margin: 0;
                        line-height: 1.6;
                    }
                    .footer {
                        background: #13131a;
                        padding: 20px 40px;
                        text-align: center;
                        border-top: 1px solid rgba(99,102,241,0.1);
                    }
                    .footer-text {
                        font-size: 11px;
                        color: #475569;
                        margin: 0;
                    }
                    .footer-brand {
                        color: #818cf8;
                        font-weight: 600;
                    }
                    @media only screen and (max-width: 600px) {
                        .container { margin: 16px; border-radius: 16px; }
                        .header { padding: 28px 24px 24px; }
                        .content, .footer { padding-left: 24px; padding-right: 24px; }
                        .otp-code { font-size: 32px; }
                        .logo-text { font-size: 24px; }
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <p class="logo-text">Vibe</p>
                        <p class="header-sub">You're almost in! Just one quick step.</p>
                    </div>
                    <div class="content">
                        <p class="greeting">Hey there! 👋</p>
                        <p class="body-text">
                            We're super excited to have you join <strong style="color:#c7d2fe;">Vibe</strong>! 
                            To get started, just pop this verification code into the app:
                        </p>
                        
                        <div class="otp-container">
                            <p class="otp-label">Your verification code</p>
                            <p class="otp-code">${otp}</p>
                            <p class="otp-timer">Expires in <strong>10 minutes</strong></p>
                        </div>

                        <div class="tip-box">
                            <p class="tip-text">💡 <strong>Pro tip:</strong> Don't share this code with anyone. Our team will never ask for it!</p>
                        </div>
                        
                        <div class="divider"></div>
                        
                        <p class="ignore-text">
                            Didn't sign up for Vibe? No worries, just ignore this email and nothing will happen. 🙂
                        </p>
                    </div>
                    <div class="footer">
                        <p class="footer-text">Made with 💜 by the <span class="footer-brand">Vibe</span> team &middot; &copy; ${new Date().getFullYear()}</p>
                    </div>
                </div>
            </body>
            </html>
        `
    };

    console.log(`-----------------------------------------`);
    console.log(`📧 SENDING OTP: ${otp} TO: ${email}`);
    console.log(`-----------------------------------------`);

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Email sent successfully:', info.messageId);
        return true;
    } catch (error) {
        console.error('Error sending email:', error);
        return false;
    }
};

const sendPasswordResetOTP = async (email, otp) => {
    const mailOptions = {
        from: '"Vibe" <noreply@vibe.chat>',
        to: email,
        subject: 'Reset Your Vibe Password',
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Reset Your Password</title>
                <style>
                    body {
                        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                        line-height: 1.6;
                        color: #e2e8f0;
                        background-color: #0f0f14;
                        margin: 0;
                        padding: 0;
                        -webkit-font-smoothing: antialiased;
                    }
                    .container {
                        max-width: 520px;
                        margin: 40px auto;
                        background: #1a1a24;
                        border-radius: 20px;
                        border: 1px solid rgba(245, 158, 11, 0.15);
                        overflow: hidden;
                    }
                    .header {
                        background: linear-gradient(135deg, #f59e0b 0%, #ef4444 50%, #ec4899 100%);
                        padding: 40px 40px 36px;
                        text-align: center;
                    }
                    .logo-text {
                        font-size: 28px;
                        font-weight: 800;
                        color: #ffffff;
                        letter-spacing: -0.03em;
                        margin: 0 0 6px 0;
                    }
                    .header-sub {
                        font-size: 14px;
                        color: rgba(255,255,255,0.85);
                        margin: 0;
                        font-weight: 400;
                    }
                    .content {
                        padding: 36px 40px 40px;
                    }
                    .greeting {
                        font-size: 22px;
                        font-weight: 700;
                        color: #f1f5f9;
                        margin: 0 0 12px 0;
                    }
                    .body-text {
                        font-size: 15px;
                        color: #94a3b8;
                        margin: 0 0 8px 0;
                        line-height: 1.7;
                    }
                    .otp-container {
                        background: linear-gradient(135deg, rgba(245,158,11,0.1) 0%, rgba(239,68,68,0.1) 100%);
                        border: 1px solid rgba(245,158,11,0.25);
                        border-radius: 16px;
                        padding: 28px;
                        text-align: center;
                        margin: 28px 0;
                    }
                    .otp-label {
                        font-size: 11px;
                        text-transform: uppercase;
                        letter-spacing: 0.15em;
                        color: #fbbf24;
                        font-weight: 600;
                        margin: 0 0 12px 0;
                    }
                    .otp-code {
                        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
                        font-size: 40px;
                        font-weight: 800;
                        letter-spacing: 0.3em;
                        color: #ffffff;
                        margin: 0;
                    }
                    .otp-timer {
                        font-size: 12px;
                        color: #64748b;
                        margin: 14px 0 0 0;
                    }
                    .otp-timer strong {
                        color: #f59e0b;
                    }
                    .divider {
                        height: 1px;
                        background: rgba(245,158,11,0.12);
                        margin: 28px 0;
                    }
                    .tip-box {
                        background: rgba(239,68,68,0.08);
                        border: 1px solid rgba(239,68,68,0.15);
                        border-radius: 12px;
                        padding: 16px 20px;
                        margin: 0 0 24px 0;
                    }
                    .tip-text {
                        font-size: 13px;
                        color: #fca5a5;
                        margin: 0;
                        line-height: 1.6;
                    }
                    .ignore-text {
                        font-size: 13px;
                        color: #475569;
                        margin: 0;
                        line-height: 1.6;
                    }
                    .footer {
                        background: #13131a;
                        padding: 20px 40px;
                        text-align: center;
                        border-top: 1px solid rgba(245,158,11,0.1);
                    }
                    .footer-text {
                        font-size: 11px;
                        color: #475569;
                        margin: 0;
                    }
                    .footer-brand {
                        color: #fbbf24;
                        font-weight: 600;
                    }
                    @media only screen and (max-width: 600px) {
                        .container { margin: 16px; border-radius: 16px; }
                        .header { padding: 28px 24px 24px; }
                        .content, .footer { padding-left: 24px; padding-right: 24px; }
                        .otp-code { font-size: 32px; }
                        .logo-text { font-size: 24px; }
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <p class="logo-text">Vibe</p>
                        <p class="header-sub">Password reset request</p>
                    </div>
                    <div class="content">
                        <p class="greeting">No worries, we got you! 🔐</p>
                        <p class="body-text">
                            Someone (hopefully you!) requested a password reset for your <strong style="color:#fde68a;">Vibe</strong> account. 
                            Use this code to set a new password:
                        </p>
                        
                        <div class="otp-container">
                            <p class="otp-label">Password reset code</p>
                            <p class="otp-code">${otp}</p>
                            <p class="otp-timer">Expires in <strong>10 minutes</strong></p>
                        </div>

                        <div class="tip-box">
                            <p class="tip-text">🚨 <strong>Heads up:</strong> If you didn't request this, someone may be trying to access your account. You can safely ignore this email.</p>
                        </div>
                        
                        <div class="divider"></div>
                        
                        <p class="ignore-text">
                            Need help? Just reply to this email and we'll sort it out. 💛
                        </p>
                    </div>
                    <div class="footer">
                        <p class="footer-text">Made with 💛 by the <span class="footer-brand">Vibe</span> team &middot; &copy; ${new Date().getFullYear()}</p>
                    </div>
                </div>
            </body>
            </html>
        `
    };

    console.log(`-----------------------------------------`);
    console.log(`🔑 SENDING PASSWORD RESET OTP: ${otp} TO: ${email}`);
    console.log(`-----------------------------------------`);

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Password reset email sent:', info.messageId);
        return true;
    } catch (error) {
        console.error('Error sending password reset email:', error);
        return false;
    }
};

module.exports = { sendOTP, sendPasswordResetOTP };
