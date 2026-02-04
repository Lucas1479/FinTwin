import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import GoalCreatePathways from '../../pages/GoalCreatePathways';

// 1. Mock the react-router-dom hook 'useNavigate'
const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// 2. Mock MainLayout to isolate the component logic
// We don't want to test the sidebar/header logic here, just the content of this page
vi.mock('../../components/layout/MainLayout', () => ({
  default: ({ children }) => <div data-testid="mock-layout">{children}</div>,
}));

describe('GoalCreatePathways', () => {
  beforeEach(() => {
    // Clear the mock history before each test so counts don't stack up
    vi.clearAllMocks();
  });

  it('renders the header and description correctly', () => {
    render(<GoalCreatePathways />);

    // Check main title
    expect(screen.getByText(/Create a new goal/i)).toBeInTheDocument();
    
    // Check description text
    expect(screen.getByText(/Choose how you want to start/i)).toBeInTheDocument();
  });

  it('renders both selection cards', () => {
    render(<GoalCreatePathways />);

    // Check AI Card content
    expect(screen.getByText('Talk to the AI')).toBeInTheDocument();
    expect(screen.getByText(/Recommended for fuzzy goals/i)).toBeInTheDocument();

    // Check Gallery Card content
    expect(screen.getByText('Choose from gallery')).toBeInTheDocument();
    expect(screen.getByText(/Recommended for clear goals/i)).toBeInTheDocument();
  });

  it('navigates to the AI intake flow when "Talk to the AI" is clicked', () => {
    render(<GoalCreatePathways />);

    // Find the button associated with the AI text
    // We use closest('button') to ensure we get the clickable element wrapping the text
    const aiButton = screen.getByText('Talk to the AI').closest('button');
    
    fireEvent.click(aiButton);

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith('/goals/new/ai');
  });

  it('navigates to the Gallery flow when "Choose from gallery" is clicked', () => {
    render(<GoalCreatePathways />);

    const galleryButton = screen.getByText('Choose from gallery').closest('button');
    
    fireEvent.click(galleryButton);

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith('/goals/new/gallery');
  });
});

