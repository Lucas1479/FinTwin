import jwt from 'jsonwebtoken';
import asyncHandler from 'express-async-handler';
import User from '../models/userModel.js';
import { BadRequestError, UnauthorizedError } from '../utils/errors.js';

// @desc    Register new user
// @route   POST /api/users/register
// @access  Public
const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    throw new BadRequestError('Please add all fields');
  }

  // Check if user exists
  const userExists = await User.findOne({ email });

  if (userExists) {
    throw new BadRequestError('User already exists', 'USER_EXISTS');
  }

  // Create user
  const user = await User.create({
    name,
    email,
    password,
  });

  if (user) {
    generateToken(res, user._id);
    res.status(201).json({
      _id: user.id,
      name: user.name,
      email: user.email,
    });
  } else {
    throw new BadRequestError('Invalid user data');
  }
});

// @desc    Authenticate a user
// @route   POST /api/users/login
// @access  Public
const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Check for user email
  // explicitly select password because it's set to select: false in schema
  const user = await User.findOne({ email }).select('+password');

  if (user && (await user.matchPassword(password))) {
    generateToken(res, user._id);
    res.json({
      _id: user.id,
      name: user.name,
      email: user.email,
    });
  } else {
    throw new UnauthorizedError('Invalid credentials');
  }
});

// @desc    Get user data (profile summary used by frontend dashboards)
// @route   GET /api/users/me
// @access  Private
const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  res.status(200).json({
    id: user._id,
    name: user.name,
    username: user.username,
    email: user.email,
    riskProfile: user.riskProfile,
    household: user.household,
    compliance: user.compliance,
    allocation: user.allocation,
    settings: user.settings,
    privacy: user.privacy,
    security: user.security,
    // Compatibility fields (for older frontend versions if any)
    riskTolerance: user.riskProfile?.level || 'Balanced',
    retirement_age: user.riskProfile?.retirementAge || 65,
  });
});

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
const updateUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);

  if (user) {
    user.name = req.body.name || user.name;
    user.username = req.body.username || user.username;
    user.email = req.body.email || user.email;

    // Use a deep merge approach for sub-documents to avoid overwriting defaults
    if (req.body.riskProfile) {
      user.riskProfile = { ...user.riskProfile.toObject(), ...req.body.riskProfile };
    }
    if (req.body.household) {
      user.household = { ...user.household.toObject(), ...req.body.household };
    }
    if (req.body.compliance) {
      user.compliance = { ...user.compliance.toObject(), ...req.body.compliance };
    }
    if (req.body.allocation) {
      user.allocation = { ...user.allocation.toObject(), ...req.body.allocation };
    }
    if (req.body.settings) {
      user.settings = { ...user.settings.toObject(), ...req.body.settings };
    }
    if (req.body.privacy) {
      user.privacy = { ...user.privacy.toObject(), ...req.body.privacy };
    }
    if (req.body.security) {
      user.security = { ...user.security.toObject(), ...req.body.security };
    }

    if (req.body.password) {
      user.password = req.body.password;
    }

    const updatedUser = await user.save();

    res.json({
      id: updatedUser._id,
      name: updatedUser.name,
      username: updatedUser.username,
      email: updatedUser.email,
      riskProfile: updatedUser.riskProfile,
      household: updatedUser.household,
      compliance: updatedUser.compliance,
      allocation: updatedUser.allocation,
      settings: updatedUser.settings,
      privacy: updatedUser.privacy,
      security: updatedUser.security,
    });
  } else {
    res.status(404);
    throw new Error('User not found');
  }
});

// @desc    Logout user / clear JWT cookie
// @route   POST /api/users/logout
// @access  Public (only clears auth cookie, no auth required)
const logoutUser = asyncHandler(async (req, res) => {
  // Clear httpOnly JWT cookie
  res.cookie('jwt', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    expires: new Date(0),
  });

  res.status(200).json({ message: 'Logged out successfully' });
});

// Generate JWT and set cookie
const generateToken = (res, userId) => {
  const token = jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });

  res.cookie('jwt', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
    sameSite: 'lax', // Lax is better for general navigation and development than Strict
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  });
};

// @desc    Update user password
// @route   PUT /api/users/password
// @access  Private
const updateUserPassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    throw new BadRequestError('Please provide both current and new passwords');
  }

  const user = await User.findById(req.user.id).select('+password');

  if (user && (await user.matchPassword(currentPassword))) {
    user.password = newPassword;
    await user.save();
    res.status(200).json({ message: 'Password updated successfully' });
  } else {
    throw new UnauthorizedError('Invalid current password');
  }
});

export {
  registerUser,
  loginUser,
  getMe,
  logoutUser,
  updateUserProfile,
  updateUserPassword,
};