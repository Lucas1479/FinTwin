import api from '../utils/api';

/**
 * User Service - Handles all Profile, Settings, and Preference related API calls.
 * Follows the project's vertical slice architecture.
 */

// Fetch current user profile with all structured sub-schemas
export const getUserProfile = async () => {
  try {
    const { data } = await api.get('/users/me');
    return data;
  } catch (error) {
    console.error('[userService] getUserProfile failed:', error);
    throw error;
  }
};

// Update user profile - supports partial updates for sub-schemas
// Payload structure should match the backend sub-schemas: 
// { riskProfile, household, compliance, allocation, settings, privacy, security }
export const updateProfile = async (profileData) => {
  try {
    const { data } = await api.put('/users/profile', profileData);
    return data;
  } catch (error) {
    console.error('[userService] updateProfile failed:', error);
    throw error;
  }
};

// Placeholder for Avatar upload (could use a separate endpoint or base64 in updateProfile)
export const uploadAvatar = async (file) => {
  // Logic for multer/cloudinary would go here
  console.log('[userService] Avatar upload triggered', file);
  return { url: 'https://via.placeholder.com/150' }; 
};

// Update user password
export const updatePassword = async (passwords) => {
  try {
    const { data } = await api.put('/users/password', passwords);
    return data;
  } catch (error) {
    console.error('[userService] updatePassword failed:', error);
    throw error;
  }
};

// Export user data as JSON (Financial Passport)
export const exportFinancialData = async () => {
  try {
    const profile = await getUserProfile();
    // In a real app, this might include goals and assets too
    const blob = new Blob([JSON.stringify(profile, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Financial_Passport_${profile.username || 'user'}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error('[userService] Data export failed:', error);
  }
};

