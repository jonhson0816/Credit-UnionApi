const User = require('../models/User');
const fs = require('fs').promises;
const path = require('path');
const cloudinary = require('../config/cloudinary');

const profileController = {
  /**
   * Get current user's profile
   */
  getProfile: async (req, res) => {
    try {
      const user = await User.findById(req.user._id)
        .select('-password -resetToken -resetTokenExpires')
        .lean();
        
      if (!user) {
        return res.status(404).json({ 
          success: false,
          message: 'User not found' 
        });
      }

      // Add memberSince and id for frontend consistency
      const profile = {
        ...user,
        memberSince: user.createdAt,
        id: user._id.toString()
      };

      res.json({ 
        success: true,
        profile 
      });
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get profile',
        error: error.message
      });
    }
  },

  /**
   * Update user profile
   */
  updateProfile: async (req, res) => {
    try {
      const userId = req.user._id;
      const updateData = req.body;
      
      // Remove sensitive fields that shouldn't be updated directly
      const { password, resetToken, resetTokenExpires, _id, ...safeUpdateData } = updateData;
      
      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { $set: safeUpdateData },
        { new: true, runValidators: true }
      ).select('-password -resetToken -resetTokenExpires');
  
      if (!updatedUser) {
        return res.status(404).json({ 
          success: false,
          message: 'User not found' 
        });
      }
  
      const profile = {
        ...updatedUser.toObject(),
        memberSince: updatedUser.createdAt,
        id: updatedUser._id.toString()
      };

      res.json({
        success: true,
        message: 'Profile updated successfully',
        profile
      });
    } catch (error) {
      console.error('Profile update error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update profile',
        error: error.message
      });
    }
  },

  /**
   * Upload profile image
   */
  uploadProfileImage: async (req, res) => {
  try {
    console.log('Upload request received');
    console.log('File:', req.file);
    console.log('User:', req.user?._id);

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided'
      });
    }

    const userId = req.user._id;
    const user = await User.findById(userId);

    if (!user) {
      // Clean up uploaded file
      if (req.file && req.file.path) {
        await fs.unlink(req.file.path).catch(err => 
          console.error('Error deleting temp file:', err)
        );
      }
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    let imageUrl;
    
    // If using cloudinary
    if (process.env.USE_CLOUDINARY === 'true' && cloudinary) {
      try {
        // Delete old image if exists
        if (user.cloudinaryImageId) {
          await cloudinary.uploader.destroy(user.cloudinaryImageId).catch(err =>
            console.error('Error deleting old Cloudinary image:', err)
          );
        }
        
        // Upload to cloudinary
        const result = await cloudinary.uploader.upload(req.file.path, {
          folder: 'navy-federal/profiles',
          transformation: [
            { width: 400, height: 400, crop: 'fill' },
            { quality: 'auto' }
          ]
        });
        
        user.profileImage = result.secure_url;
        user.cloudinaryImageId = result.public_id;
        
        // Delete local file
        await fs.unlink(req.file.path).catch(err => 
          console.error('Error deleting temp file:', err)
        );
        
        imageUrl = result.secure_url;
      } catch (cloudinaryError) {
        console.error('Cloudinary upload error:', cloudinaryError);
        // Fall back to local storage
        const imagePath = `/uploads/profiles/${req.file.filename}`;
        user.profileImage = imagePath;
        user.cloudinaryImageId = null;
        imageUrl = imagePath;
      }
    } else {
      // Use local file storage
      // Delete old image if it exists and is local
      if (user.profileImage && user.profileImage.startsWith('/uploads/')) {
        try {
          const oldImagePath = path.join(__dirname, '..', user.profileImage);
          await fs.unlink(oldImagePath).catch(err => 
            console.error('Error deleting old image:', err)
          );
        } catch (unlinkError) {
          console.error('Error deleting old profile image:', unlinkError);
        }
      }
      
      // Set new image path
      const imagePath = `/uploads/profiles/${req.file.filename}`;
      user.profileImage = imagePath;
      user.cloudinaryImageId = null;
      
      imageUrl = imagePath;
    }
    
    await user.save();

    console.log('Profile image updated successfully:', imageUrl);

    res.json({
      success: true,
      message: 'Profile image updated successfully',
      profileImage: imageUrl
    });
  } catch (error) {
    // Try to delete temporary file if it exists
    if (req.file && req.file.path) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        console.error('Error deleting temporary file:', unlinkError);
      }
    }

    console.error('Profile image upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload profile image',
      error: error.message
    });
  }
},

  /**
   * Remove profile image
   */
  removeProfileImage: async (req, res) => {
    try {
      const userId = req.user._id;
      const user = await User.findById(userId);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      
      // If using cloudinary
      if (user.cloudinaryImageId && cloudinary) {
        await cloudinary.uploader.destroy(user.cloudinaryImageId);
      }
      
      // If local file
      if (user.profileImage && user.profileImage.startsWith('/uploads/')) {
        try {
          const imagePath = path.join(__dirname, '..', user.profileImage);
          await fs.unlink(imagePath);
        } catch (error) {
          console.error('Error deleting profile image file:', error);
          // Continue even if delete fails
        }
      }
      
      user.profileImage = null;
      user.cloudinaryImageId = null;
      await user.save();
      
      res.json({
        success: true,
        message: 'Profile image removed successfully'
      });
    } catch (error) {
      console.error('Remove profile image error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to remove profile image',
        error: error.message
      });
    }
  }
};

module.exports = profileController;