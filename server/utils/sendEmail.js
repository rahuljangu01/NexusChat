// server/utils/sendEmail.js (FINAL & CORRECTED FOR SENDGRID)

const nodemailer = require('nodemailer');

const sendVerificationEmail = async (email, code) => {
  try {
    // <<< --- BADLAAV YAHAN HAI --- >>>
    // Hum ab 'SENDGRID_API_KEY' ka istemaal kar rahe hain
    const transporter = nodemailer.createTransport({
      host: 'smtp.sendgrid.net',
      port: 587,
      auth: {
        user: process.env.EMAIL_USER,       // Yeh .env se 'apikey' uthayega
        pass: process.env.SENDGRID_API_KEY, // Yeh .env se aapki SendGrid API Key uthayega
      },
    });

    const mailOptions = {
      from: `"Nexus Chat" <${process.env.SENDER_EMAIL}>`, // Yeh .env se aapka verified sender email uthayega
      to: email,
      subject: 'Your Nexus Account Verification Code',
      html: `
        <div style="font-family: Arial, sans-serif; color: #333;">
          <h2>Welcome to Nexus Chat!</h2>
          <p>Thank you for registering. Please use the following code to verify your email address:</p>
          <p style="font-size: 24px; font-weight: bold; letter-spacing: 2px; background: #f0f0f0; padding: 10px; border-radius: 5px; display: inline-block;">
            ${code}
          </p>
          <p>This code will expire in 10 minutes.</p>
          <p>If you did not request this, please ignore this email.</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log('Verification email sent successfully via SendGrid');
  } catch (error)
   {
    console.error('Error sending email via SendGrid:', error);
    // Behtar error handling ke liye poora error object throw karein
    throw error;
  }
};

module.exports = { sendVerificationEmail };