import express from 'express';
import { registerUser, loginUser, getMe, logoutUser, updateUserProfile, updateUserPassword, resetDemoData } from '../../controllers/userController.js';
import { protect } from '../../middleware/authMiddleware.js';

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/logout', logoutUser);
router.get('/me', protect, getMe);
router.get('/profile', protect, getMe); // Legacy compatibility
router.put('/profile', protect, updateUserProfile);
router.put('/password', protect, updateUserPassword);
router.post('/reset-demo-data', protect, resetDemoData);

export default router;

