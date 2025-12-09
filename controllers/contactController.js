const ContactInquiry = require('../models/ContactInquiry');
const nodemailer = require('nodemailer');

// Email transporter configuration
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// @desc    Submit contact inquiry
// @route   POST /api/contact/submit
// @access  Public
exports.submitContactInquiry = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      subject,
      message,
      memberNumber,
      preferredContactMethod
    } = req.body;

    // Validation
    if (!firstName || !lastName || !email || !phone || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }

    // Create contact inquiry
    const contactInquiry = await ContactInquiry.create({
      firstName,
      lastName,
      email,
      phone,
      subject,
      message,
      memberNumber,
      preferredContactMethod
    });

    // Send email notification to admin
    try {
      const mailOptions = {
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to: process.env.ADMIN_EMAIL || process.env.EMAIL_USER,
        subject: `New Contact Inquiry: ${subject}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #003366; color: white; padding: 20px; text-align: center;">
              <h2>Navy Federal Credit Union</h2>
              <p>New Contact Inquiry Received</p>
            </div>
            <div style="padding: 20px; background-color: #f5f5f5;">
              <h3 style="color: #003366;">Contact Details:</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px; font-weight: bold; width: 40%;">Name:</td>
                  <td style="padding: 8px;">${firstName} ${lastName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px; font-weight: bold;">Email:</td>
                  <td style="padding: 8px;">${email}</td>
                </tr>
                <tr>
                  <td style="padding: 8px; font-weight: bold;">Phone:</td>
                  <td style="padding: 8px;">${phone}</td>
                </tr>
                <tr>
                  <td style="padding: 8px; font-weight: bold;">Subject:</td>
                  <td style="padding: 8px;">${subject}</td>
                </tr>
                ${memberNumber ? `
                <tr>
                  <td style="padding: 8px; font-weight: bold;">Member Number:</td>
                  <td style="padding: 8px;">${memberNumber}</td>
                </tr>
                ` : ''}
                <tr>
                  <td style="padding: 8px; font-weight: bold;">Preferred Contact:</td>
                  <td style="padding: 8px;">${preferredContactMethod}</td>
                </tr>
              </table>
              
              <h3 style="color: #003366; margin-top: 20px;">Message:</h3>
              <div style="background-color: white; padding: 15px; border-left: 4px solid #FFB81C; margin-top: 10px;">
                ${message}
              </div>
              
              <p style="margin-top: 20px; color: #666;">
                Submitted: ${new Date().toLocaleString()}
              </p>
            </div>
            <div style="background-color: #003366; color: white; padding: 15px; text-align: center; font-size: 12px;">
              <p>This is an automated notification from Navy Federal Credit Union Contact System</p>
            </div>
          </div>
        `
      };

      await transporter.sendMail(mailOptions);
    } catch (emailError) {
      console.error('Email notification failed:', emailError);
      // Continue even if email fails
    }

    // Send confirmation email to customer
    try {
      const customerMailOptions = {
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to: email,
        subject: 'We Received Your Message - Navy Federal Credit Union',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #003366; color: white; padding: 20px; text-align: center;">
              <h2>Navy Federal Credit Union</h2>
            </div>
            <div style="padding: 30px; background-color: #f5f5f5;">
              <h2 style="color: #003366;">Thank You for Contacting Us!</h2>
              <p>Dear ${firstName} ${lastName},</p>
              <p>We have received your inquiry regarding <strong>${subject}</strong> and a member of our team will respond to you within 1-2 business days.</p>
              
              <div style="background-color: white; padding: 20px; border-radius: 5px; margin: 20px 0;">
                <h3 style="color: #003366; margin-top: 0;">Your Inquiry Summary:</h3>
                <p><strong>Reference Number:</strong> ${contactInquiry._id}</p>
                <p><strong>Subject:</strong> ${subject}</p>
                <p><strong>Preferred Contact Method:</strong> ${preferredContactMethod}</p>
              </div>
              
              <p>If you need immediate assistance, please call us at:</p>
              <div style="background-color: #FFB81C; padding: 15px; text-align: center; border-radius: 5px; margin: 20px 0;">
                <h3 style="margin: 0; color: #003366;">1-888-842-6328</h3>
                <p style="margin: 5px 0 0 0; color: #003366;">Available 24/7</p>
              </div>
              
              <p style="color: #666; font-size: 14px; margin-top: 30px;">
                Please note: For security purposes, we will never ask for your full account number, PIN, or password via email.
              </p>
            </div>
            <div style="background-color: #003366; color: white; padding: 15px; text-align: center; font-size: 12px;">
              <p style="margin: 0;">Navy Federal Credit Union | Federally insured by NCUA</p>
              <p style="margin: 5px 0 0 0;">© 2025 Navy Federal Credit Union. All rights reserved.</p>
            </div>
          </div>
        `
      };

      await transporter.sendMail(customerMailOptions);
    } catch (emailError) {
      console.error('Customer confirmation email failed:', emailError);
    }

    res.status(201).json({
      success: true,
      message: 'Your inquiry has been submitted successfully. We will contact you soon.',
      data: {
        referenceNumber: contactInquiry._id,
        firstName: contactInquiry.firstName,
        lastName: contactInquiry.lastName,
        email: contactInquiry.email,
        subject: contactInquiry.subject,
        submittedAt: contactInquiry.submittedAt
      }
    });

  } catch (error) {
    console.error('Contact inquiry submission error:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Unable to submit your inquiry. Please try again later.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get all contact inquiries (Admin only)
// @route   GET /api/contact/inquiries
// @access  Private/Admin
exports.getAllInquiries = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;

    const query = status ? { status } : {};
    
    const inquiries = await ContactInquiry.find(query)
      .sort({ submittedAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const count = await ContactInquiry.countDocuments(query);

    res.status(200).json({
      success: true,
      data: inquiries,
      pagination: {
        total: count,
        page: parseInt(page),
        pages: Math.ceil(count / limit)
      }
    });

  } catch (error) {
    console.error('Get inquiries error:', error);
    res.status(500).json({
      success: false,
      message: 'Unable to retrieve inquiries'
    });
  }
};

// @desc    Get single inquiry by ID
// @route   GET /api/contact/inquiries/:id
// @access  Private/Admin
exports.getInquiryById = async (req, res) => {
  try {
    const inquiry = await ContactInquiry.findById(req.params.id);

    if (!inquiry) {
      return res.status(404).json({
        success: false,
        message: 'Inquiry not found'
      });
    }

    res.status(200).json({
      success: true,
      data: inquiry
    });

  } catch (error) {
    console.error('Get inquiry error:', error);
    res.status(500).json({
      success: false,
      message: 'Unable to retrieve inquiry'
    });
  }
};

// @desc    Update inquiry status
// @route   PATCH /api/contact/inquiries/:id
// @access  Private/Admin
exports.updateInquiryStatus = async (req, res) => {
  try {
    const { status, adminNotes, priority } = req.body;

    const updateData = {};
    if (status) updateData.status = status;
    if (adminNotes) updateData.adminNotes = adminNotes;
    if (priority) updateData.priority = priority;
    
    if (status === 'Resolved' || status === 'Closed') {
      updateData.resolvedAt = new Date();
    }

    const inquiry = await ContactInquiry.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!inquiry) {
      return res.status(404).json({
        success: false,
        message: 'Inquiry not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Inquiry updated successfully',
      data: inquiry
    });

  } catch (error) {
    console.error('Update inquiry error:', error);
    res.status(500).json({
      success: false,
      message: 'Unable to update inquiry'
    });
  }
};

// @desc    Delete inquiry
// @route   DELETE /api/contact/inquiries/:id
// @access  Private/Admin
exports.deleteInquiry = async (req, res) => {
  try {
    const inquiry = await ContactInquiry.findByIdAndDelete(req.params.id);

    if (!inquiry) {
      return res.status(404).json({
        success: false,
        message: 'Inquiry not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Inquiry deleted successfully'
    });

  } catch (error) {
    console.error('Delete inquiry error:', error);
    res.status(500).json({
      success: false,
      message: 'Unable to delete inquiry'
    });
  }
};