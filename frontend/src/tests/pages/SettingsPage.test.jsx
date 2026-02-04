import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import SettingsPage from '../../pages/SettingsPage';

// --- 1. MOCK SERVICES ---
import * as userService from '../../services/userService';

vi.mock('../../services/userService', () => ({
  getUserProfile: vi.fn(),
  updateProfile: vi.fn(),
  updatePassword: vi.fn(),
  exportFinancialData: vi.fn(),
}));

// --- 2. MOCK LAYOUT ---
vi.mock('../../components/layout/MainLayout', () => ({
  default: ({ children }) => <div data-testid="main-layout">{children}</div>,
}));

// --- 3. MOCK SUB-SECTIONS ---
// We render simple divs to prove the tabs are switching correctly
vi.mock('../../components/profile/sections/RiskStrategySection', () => ({
  default: () => <div data-testid="section-risk">Risk Section Content</div>
}));
vi.mock('../../components/profile/sections/HouseholdSection', () => ({
  default: () => <div data-testid="section-household">Household Section Content</div>
}));
vi.mock('../../components/profile/sections/TaxComplianceSection', () => ({
  default: () => <div data-testid="section-tax">Tax Section Content</div>
}));
vi.mock('../../components/profile/sections/AssetFlowSection', () => ({
  default: () => <div data-testid="section-flow">Flow Section Content</div>
}));

// *Special Mock*: This one needs to trigger the Password Modal
vi.mock('../../components/profile/sections/PrivacySecuritySection', () => ({
  default: ({ onOpenPasswordModal }) => (
    <div data-testid="section-privacy">
      Privacy Content
      <button onClick={onOpenPasswordModal}>Trigger Password Change</button>
    </div>
  )
}));

describe('SettingsPage', () => {
  const mockProfile = {
    name: 'Test User',
    email: 'test@example.com',
    username: 'testuser',
    settings: { theme: 'light', currency: 'NZD' },
    riskProfile: {},
    household: {},
    compliance: {},
    allocation: {},
    privacy: {},
    security: {}
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Default: Return a valid profile
    userService.getUserProfile.mockResolvedValue(mockProfile);
    userService.updateProfile.mockResolvedValue(mockProfile);
  });

  it('renders correctly and loads profile data', async () => {
    render(
      <MemoryRouter>
        <SettingsPage />
      </MemoryRouter>
    );

    // 1. Should show loading initially (or resolve fast)
    // We wait for the name to appear in the input
    await waitFor(() => {
      expect(screen.getByDisplayValue('Test User')).toBeInTheDocument();
    });

    // 2. Check Static fields
    expect(screen.getByDisplayValue('test@example.com')).toBeInTheDocument();
    
    // 3. Check "General" tab content is visible (default)
    expect(screen.getByText('Personal Identity')).toBeInTheDocument();
  });

  it('switches tabs and renders corresponding sections', async () => {
    render(
      <MemoryRouter>
        <SettingsPage />
      </MemoryRouter>
    );
    await waitFor(() => screen.getByDisplayValue('Test User'));

    // Switch to Risk
    fireEvent.click(screen.getByText('Risk & Strategy'));
    expect(screen.getByTestId('section-risk')).toBeInTheDocument();
    expect(screen.queryByText('Personal Identity')).not.toBeInTheDocument();

    // Switch to Privacy
    fireEvent.click(screen.getByText('Privacy & Security'));
    expect(screen.getByTestId('section-privacy')).toBeInTheDocument();
  });

  it('updates profile state and calls API on save', async () => {
    render(
      <MemoryRouter>
        <SettingsPage />
      </MemoryRouter>
    );
    await waitFor(() => screen.getByDisplayValue('Test User'));

    // 1. Change Name
    const nameInput = screen.getByDisplayValue('Test User');
    fireEvent.change(nameInput, { target: { value: 'Updated Name' } });

    // 2. Click Save
    const saveBtn = screen.getByText('Save Changes');
    fireEvent.click(saveBtn);

    // 3. Verify API call
    expect(userService.updateProfile).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Updated Name'
      })
    );

    // 4. Check for success state (button text changes)
    await waitFor(() => {
        expect(screen.getByText('Saved!')).toBeInTheDocument();
    });
  });

  it('handles password change flow', async () => {
    render(
      <MemoryRouter>
        <SettingsPage />
      </MemoryRouter>
    );
    await waitFor(() => screen.getByDisplayValue('Test User'));

    // 1. Navigate to Privacy Tab
    fireEvent.click(screen.getByText('Privacy & Security'));

    // 2. Trigger Modal (using our special mock button)
    fireEvent.click(screen.getByText('Trigger Password Change'));

    // 3. Verify Modal Open
    const modal = await waitFor(() => screen.getByText('Change Password'));
    const modalContainer = modal.closest('div[class*="fixed"]') || modal.closest('div');
    const modalScope = within(modalContainer);

    // 4. Fill Form - Find password inputs within the modal
    await waitFor(() => {
      const passwordInputs = Array.from(modalContainer.querySelectorAll('input[type="password"]'));
      expect(passwordInputs.length).toBeGreaterThanOrEqual(3);
      
      fireEvent.change(passwordInputs[0], { target: { value: 'oldpass' } });
      fireEvent.change(passwordInputs[1], { target: { value: 'newpass' } });
      fireEvent.change(passwordInputs[2], { target: { value: 'newpass' } });
    });

    // 5. Submit
    userService.updatePassword.mockResolvedValue({}); // Mock success
    fireEvent.click(screen.getByRole('button', { name: /Update Password/i }));

    // 6. Verify API Call
    await waitFor(() => {
       expect(userService.updatePassword).toHaveBeenCalledWith({
         currentPassword: 'oldpass',
         newPassword: 'newpass'
       });
    });

    // 7. Verify Success Message
    expect(screen.getByText('Password updated successfully!')).toBeInTheDocument();
  });

  it('shows error when passwords do not match', async () => {
    render(
        <MemoryRouter>
          <SettingsPage />
        </MemoryRouter>
      );
      await waitFor(() => screen.getByDisplayValue('Test User'));
  
      // Navigate and Open Modal
      fireEvent.click(screen.getByText('Privacy & Security'));
      fireEvent.click(screen.getByText('Trigger Password Change'));
  
      // Fill Mismatching Passwords - Find password inputs within the modal
      const modal = await waitFor(() => screen.getByText('Change Password'));
      const modalContainer = modal.closest('div[class*="fixed"]') || modal.closest('div');
      
      await waitFor(() => {
        const passwordInputs = Array.from(modalContainer.querySelectorAll('input[type="password"]'));
        expect(passwordInputs.length).toBeGreaterThanOrEqual(3);
        
        fireEvent.change(passwordInputs[0], { target: { value: 'oldpass' } });
        fireEvent.change(passwordInputs[1], { target: { value: 'newpass' } });
        fireEvent.change(passwordInputs[2], { target: { value: 'wrongpass' } });
      });
  
      // Submit
      fireEvent.click(screen.getByRole('button', { name: /Update Password/i }));
  
      // Check Error
      expect(screen.getByText('New passwords do not match')).toBeInTheDocument();
      expect(userService.updatePassword).not.toHaveBeenCalled();
  });
});

