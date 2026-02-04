import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest'; 
import { BrowserRouter } from 'react-router-dom';
import Login from '../../pages/LoginPage';
import * as authService from '../../services/authService'; 

// --- THE SAFETY SWITCH (MOCKING) ---
vi.mock('../../services/authService');

describe('Login Component (Safe UI Test)', () => {
  
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders login form correctly', () => {
    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    );

    // UPDATED: We use getByLabelText because it's more reliable than placeholders
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in|login/i })).toBeInTheDocument();
  });

  test('allows user to type in inputs', () => {
    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    );

    // UPDATED: Finding elements by their Label
    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/password/i);

    // Simulate typing
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    expect(emailInput.value).toBe('test@example.com');
    expect(passwordInput.value).toBe('password123');
  });

  test('calls the login function when form is submitted', async () => {
    // 1. Setup the Mock Response
    authService.login.mockResolvedValue({
      id: '123',
      name: 'Test User',
      email: 'test@example.com',
      token: 'fake_safe_token'
    });

    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    );

    // 2. Fill out the form (UPDATED to use LabelText)
    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password123' } });

    // 3. Click Submit
    fireEvent.click(screen.getByRole('button', { name: /sign in|login/i }));

    // 4. Verification
    await waitFor(() => {
      expect(authService.login).toHaveBeenCalledTimes(1);
    });
    
    expect(authService.login).toHaveBeenCalledWith('test@example.com', 'password123');
  });

  test('displays error message on failed login', async () => {
    // 1. Setup the Mock Error
    authService.login.mockRejectedValue(new Error('Invalid credentials'));
    
    // Mock window.alert since LoginPage uses alert() for errors
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    );

    // UPDATED: We MUST fill the form first. 
    // If we don't, the HTML5 'required' attribute will stop the submit 
    // and the code will never reach the error state.
    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'wrongpassword' } });

    // 2. Submit the form
    fireEvent.click(screen.getByRole('button', { name: /sign in|login/i }));

    // 3. Check if alert was called with error message
    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Invalid email or password');
    });
    
    alertSpy.mockRestore();
  });
});

