import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import OnboardingQuiz from '../../pages/OnboardingQuiz';
import * as userService from '../../services/userService';

// --- Mocks ---

// 1. Mock React Router
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// 2. Mock User Service
vi.mock('../../services/userService');

// Helper to fill out the quiz quickly
const fillQuiz = () => {
  // Q1: Experience - Select Novice
  fireEvent.click(screen.getByText('Novice'));
  fireEvent.click(screen.getByText('Next'));

  // Q2: Risk - Select Sell Everything
  fireEvent.click(screen.getByText('Sell Everything'));
  fireEvent.click(screen.getByText('Next'));

  // Q3: Horizon - Select Short Term
  fireEvent.click(screen.getByText(/Short Term/i));
  fireEvent.click(screen.getByText('Next'));

  // Q4: Market Knowledge - Select Not Familiar
  fireEvent.click(screen.getByText('Not Familiar'));
  fireEvent.click(screen.getByText('Next'));

  // Q5: KiwiSaver - Select No
  fireEvent.click(screen.getByText(/No \/ Not Eligible/i));
  fireEvent.click(screen.getByText('Next'));
};

describe('OnboardingQuiz', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    userService.updateProfile.mockResolvedValue({ success: true });
  });

  it('renders the first question initially', () => {
    render(<OnboardingQuiz />);
    expect(screen.getByText('What is your investment experience?')).toBeInTheDocument();
    expect(screen.getByText('Personalization')).toBeInTheDocument();
  });

  it('navigates to the next question when an option is selected and Next is clicked', () => {
    render(<OnboardingQuiz />);

    // Select an option
    const option = screen.getByText('Novice');
    fireEvent.click(option);

    // Click Next
    const nextBtn = screen.getByText('Next');
    fireEvent.click(nextBtn);

    // Verify next question appears
    expect(screen.getByText('If the market drops 20%, what would you do?')).toBeInTheDocument();
  });

  it('allows navigation back to previous question', () => {
    render(<OnboardingQuiz />);

    // Go forward one step
    fireEvent.click(screen.getByText('Novice'));
    fireEvent.click(screen.getByText('Next'));
    expect(screen.getByText(/market drops/i)).toBeInTheDocument();

    // Click Back
    fireEvent.click(screen.getByText('Back'));

    // Verify we are back at start
    expect(screen.getByText('What is your investment experience?')).toBeInTheDocument();
    
    // Verify selection was remembered (Novice should have the active style or checkmark)
    // In the code, active items have a CheckCircle icon rendered
    // We can check if the CheckCircle is present within the Novice button
    const noviceButton = screen.getByText('Novice').closest('button');
    expect(noviceButton).toContainHTML('lucide-circle-check'); // Lucide icons usually render with class names or svg
  });

  it('calculates the summary correctly based on answers', () => {
    render(<OnboardingQuiz />);
    
    // Run through the quiz with specific "Conservative" choices
    fillQuiz();

    // Now we should be at the summary screen
    expect(screen.getByText('Confirm Your Profile')).toBeInTheDocument();

    // Verify derived values in dropdowns
    // Note: <select> values are tested by getting the element and checking .value
    expect(screen.getByDisplayValue('Conservative')).toBeInTheDocument(); // Derived from "Sell Everything"
    expect(screen.getByDisplayValue('Short Term (0-3 yr)')).toBeInTheDocument(); // Derived from "Short Term"
  });

  it('submits the profile and navigates to dashboard on completion', async () => {
    render(<OnboardingQuiz />);
    fillQuiz(); // Reach summary

    // Click Complete
    const submitBtn = screen.getByText('Complete Setup');
    fireEvent.click(submitBtn);

    // Verify Service Call
    expect(userService.updateProfile).toHaveBeenCalledWith(expect.objectContaining({
      riskProfile: expect.objectContaining({
        riskTolerance: 'Conservative',
        investmentExperience: 'Novice',
        nzMarketKnowledge: 'Low'
      }),
      compliance: expect.objectContaining({
        kiwiSaverContribution: 0,
        taxResidency: 'New Zealand'
      }),
      settings: expect.objectContaining({
        onboardingCompleted: true
      })
    }));

    // Verify Navigation (Wait for the 800ms timeout)
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    }, { timeout: 1500 });
  });

  it('allows editing the summary before submission', async () => {
    render(<OnboardingQuiz />);
    fillQuiz();

    // Change Risk Tolerance from Conservative to Aggressive
    const riskSelect = screen.getByDisplayValue('Conservative');
    fireEvent.change(riskSelect, { target: { value: 'Aggressive' } });

    // Submit
    fireEvent.click(screen.getByText('Complete Setup'));

    // Verify payload sent 'Aggressive'
    expect(userService.updateProfile).toHaveBeenCalledWith(expect.objectContaining({
      riskProfile: expect.objectContaining({
        riskTolerance: 'Aggressive'
      })
    }));
  });

  it('skips the quiz when the skip button is clicked', () => {
    render(<OnboardingQuiz />);

    const skipBtn = screen.getByText(/Skip for now/i);
    fireEvent.click(skipBtn);

    expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
  });
});

