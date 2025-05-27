import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

export async function POST(request) {
  try {
    const { email, projectId, projectName, inviterName } = await request.json();

    // Create an invitation token (you might want to use a more secure method)
    const inviteToken = Buffer.from(`${email}:${projectId}`).toString('base64');
    
    const acceptUrl = `${process.env.NEXT_PUBLIC_APP_URL}/accept-invite/${inviteToken}`;

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: `Invitation to collaborate on ${projectName}`,
      html: `
        <h1>Project Collaboration Invitation</h1>
        <p>Hello,</p>
        <p>${inviterName} has invited you to collaborate on the project "${projectName}".</p>
        <p>Click the link below to accept the invitation:</p>
        <a href="${acceptUrl}" style="display: inline-block; padding: 10px 20px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 5px;">Accept Invitation</a>
        <p>If you didn't expect this invitation, you can ignore this email.</p>
      `,
    };

    await transporter.sendMail(mailOptions);

    return NextResponse.json({ 
      success: true, 
      message: 'Invitation sent successfully' 
    });
  } catch (error) {
    console.error('Failed to send invitation:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to send invitation' },
      { status: 500 }
    );
  }
} 