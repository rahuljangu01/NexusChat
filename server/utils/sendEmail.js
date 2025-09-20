// server/utils/sendEmail.js (UPDATED WITH PASSWORD RESET FUNCTIONALITY)

const nodemailer = require('nodemailer');

// Helper function to create a transporter (to avoid repeating code)
const createTransporter = () => {
  return nodemailer.createTransport({
    host: 'smtp.sendgrid.net',
    port: 587,
    auth: {
      user: process.env.EMAIL_USER,       // Yeh .env se 'apikey' uthayega
      pass: process.env.SENDGRID_API_KEY, // Yeh .env se aapki SendGrid API Key uthayega
    },
  });
};

// Function to send registration verification code
const sendVerificationEmail = async (email, code) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `"Nexus Chat" <${process.env.SENDER_EMAIL}>`,
      to: email,
      subject: 'Your Nexus Account Verification Code',
      html: `
        <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
          <h2>Welcome to Nexus Chat!</h2>
          <p>Thank you for registering. Please use the following code to verify your email address:</p>
          <p style="font-size: 24px; font-weight: bold; letter-spacing: 2px; background: #f0f0f0; padding: 10px 15px; border-radius: 5px; display: inline-block;">
            ${code}
          </p>
          <p>This code will expire in 10 minutes.</p>
          <p>If you did not request this, please ignore this email.</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log('Verification email sent successfully to', email);
  } catch (error) {
    console.error('Error sending verification email:', error);
    throw error;
  }
};


// <<< --- YEH NAYA FUNCTION ADD KIYA GAYA HAI --- >>>
// Function to send the password reset link
const sendPasswordResetEmail = async (email, resetURL) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `"Nexus Chat" <${process.env.SENDER_EMAIL}>`,
      to: email,
      subject: 'Your Nexus Account Password Reset Link',
      html: `
        <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
          <h2>Password Reset Request</h2>
          <p>You requested a password reset for your Nexus account. Please click the button below to set a new password:</p>
          <a href="${resetURL}" target="_blank" style="background-color: #4f46e5; color: white; padding: 12px 20px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
            Reset Your Password
          </a>
          <p style="margin-top: 20px;">This link is valid for only 10 minutes.</p>
          <p>If you did not request this, please ignore this email and your password will remain unchanged.</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log('Password reset email sent successfully to', email);
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw error;
  }
};


// Dono functions ko export karo
module.exports = { 
  sendVerificationEmail,
  sendPasswordResetEmail 
};