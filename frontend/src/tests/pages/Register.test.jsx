import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import RegisterPage from '../../pages/RegisterPage';
import * as authService from '../../services/authService';

// 1. Mock the specific Auth Service function
vi.mock('../../services/authService', () => ({
  register: vi.fn(),
}));

// 2. Mock React Router's useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('Register Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all registration inputs correctly', () => {
    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>
    );

    // Check for specific fields
    expect(screen.getByPlaceholderText(/john doe/i)).toBeInTheDocument(); // Name
    expect(screen.getByPlaceholderText(/name@company.com/i)).toBeInTheDocument(); // Email
    expect(screen.getAllByPlaceholderText(/••••••••/i)).toHaveLength(2); // Two password fields
    expect(screen.getByRole('checkbox')).toBeInTheDocument(); // Terms checkbox
  });

  it('shows error when passwords do not match', async () => {
    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>
    );

    // Fill out form with mismatched passwords
    fireEvent.change(screen.getByPlaceholderText(/john doe/i), { target: { value: 'Test User' } });
    fireEvent.change(screen.getByPlaceholderText(/name@company.com/i), { target: { value: 'test@test.com' } });
    
    // Get password inputs (Password & Confirm)
    const passwords = screen.getAllByPlaceholderText(/••••••••/i);
    fireEvent.change(passwords[0], { target: { value: 'password123' } });
    fireEvent.change(passwords[1], { target: { value: 'mismatch123' } });

    // Click Terms Checkbox
    fireEvent.click(screen.getByRole('checkbox'));

    // Submit
    const submitBtn = screen.getByRole('button', { name: /create account/i });
    fireEvent.click(submitBtn);

    // Expect error message
    expect(await screen.findByText('Passwords do not match')).toBeInTheDocument();
    
    // Ensure register was NOT called
    expect(authService.register).not.toHaveBeenCalled();
  });

  it('calls register and navigates on valid submission', async () => {
    // Mock successful registration
    authService.register.mockResolvedValue({ id: 1, name: 'Test User' });

    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>
    );

    // Fill form correctly
    fireEvent.change(screen.getByPlaceholderText(/john doe/i), { target: { value: 'Test User' } });
    fireEvent.change(screen.getByPlaceholderText(/name@company.com/i), { target: { value: 'test@test.com' } });
    
    const passwords = screen.getAllByPlaceholderText(/••••••••/i);
    fireEvent.change(passwords[0], { target: { value: 'password123' } });
    fireEvent.change(passwords[1], { target: { value: 'password123' } });

    fireEvent.click(screen.getByRole('checkbox'));

    // Submit
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    // Verify service call
    await waitFor(() => {
      expect(authService.register).toHaveBeenCalledWith('Test User', 'test@test.com', 'password123');
    });

    // Verify navigation to onboarding
    expect(mockNavigate).toHaveBeenCalledWith('/onboarding');
  });

  it('displays error message when registration fails', async () => {
    // Mock failed registration
    authService.register.mockRejectedValue(new Error('Registration failed'));

    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>
    );

    // Fill form
    fireEvent.change(screen.getByPlaceholderText(/john doe/i), { target: { value: 'Test User' } });
    fireEvent.change(screen.getByPlaceholderText(/name@company.com/i), { target: { value: 'fail@test.com' } });
    const passwords = screen.getAllByPlaceholderText(/••••••••/i);
    fireEvent.change(passwords[0], { target: { value: 'password123' } });
    fireEvent.change(passwords[1], { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('checkbox'));

    // Submit
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    // Expect the generic error message currently in your component
    expect(await screen.findByText('Error registering user')).toBeInTheDocument();
  });
});

