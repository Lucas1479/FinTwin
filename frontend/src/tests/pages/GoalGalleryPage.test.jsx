import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import GoalGalleryPage from '../../pages/GoalGalleryPage';
import { createGoal } from '../../services/goalService';

// --- MOCKS ---

const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock('../../components/layout/MainLayout', () => ({
  default: ({ children }) => <div data-testid="main-layout">{children}</div>,
}));

// Use the factory pattern to ensure exports are mocked correctly
vi.mock('../../services/goalService', () => ({
  createGoal: vi.fn(),
}));

vi.mock('../../components/goals/GoalDefinitionForm', () => ({
  default: ({ initialValues, onSubmit, submitting }) => (
    <div data-testid="mock-goal-form">
      <span data-testid="form-goal-name">{initialValues.goal_name}</span>
      <span data-testid="form-category">{initialValues.category}</span>
      <button 
        data-testid="trigger-submit"
        onClick={() => onSubmit({ ...initialValues, submitted: true })}
        disabled={submitting}
      >
        {submitting ? 'Submitting...' : 'Submit'}
      </button>
    </div>
  ),
}));

describe('GoalGalleryPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the gallery layout with default "Retirement" selection', () => {
    render(<GoalGalleryPage />);
    expect(screen.getByText(/Choose a goal template/i)).toBeInTheDocument();
    expect(screen.getByTestId('form-goal-name')).toHaveTextContent('Retirement');
  });

  it('updates the form values when a different preset is selected', async () => {
    const user = userEvent.setup();
    render(<GoalGalleryPage />);

    const homePresetBtn = screen.getByRole('button', { name: /First Home/i });
    await user.click(homePresetBtn);

    await waitFor(() => {
      expect(screen.getByTestId('form-goal-name')).toHaveTextContent('First home');
    });
  });

  it('handles successful goal creation and navigation', async () => {
    const user = userEvent.setup();
    // Use vi.mocked for type safety
    vi.mocked(createGoal).mockResolvedValue({ id: 'goal-123', success: true });
    
    render(<GoalGalleryPage />);
    await user.click(screen.getByTestId('trigger-submit'));
    
    await waitFor(() => {
      expect(createGoal).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('/goals');
    });
  });

  it('handles API errors gracefully (does not navigate)', async () => {
    const user = userEvent.setup();
    // Mock the error to prevent it from failing the test suite
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    // FIX: Using mockRejectedValue once and specifically checking for it
    vi.mocked(createGoal).mockRejectedValue(new Error('Network Error'));

    render(<GoalGalleryPage />);
    await user.click(screen.getByTestId('trigger-submit'));

    // FIX: We must wait for the async action to settle. 
    // Even if it fails, the rejection needs to be handled by the test runner.
    await waitFor(() => {
      expect(createGoal).toHaveBeenCalled();
    });

    // Check that navigation NEVER happened
    expect(mockNavigate).not.toHaveBeenCalled();
    
    // Ensure the form is still there (the UI didn't crash)
    expect(screen.getByTestId('mock-goal-form')).toBeInTheDocument();

    consoleSpy.mockRestore();
  });
});