import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import GoalsPage from '../../pages/GoalsPage';

// --- 1. MOCK THE CONTEXT ---
import * as SimulationContext from '../../context/SimulationContext';
vi.mock('../../context/SimulationContext', () => ({
  useSimulation: vi.fn(),
  useSimulatedData: vi.fn(),
}));

// --- 2. MOCK THE SERVICES ---
import * as goalService from '../../services/goalService';
vi.mock('../../services/goalService', () => ({
  getGoals: vi.fn(),
  updateGoal: vi.fn(),
  deleteGoal: vi.fn(),
}));

// --- 3. MOCK CHILD COMPONENTS ---
vi.mock('../../components/layout/MainLayout', () => ({
  default: ({ children }) => <div data-testid="main-layout">{children}</div>,
}));

// Mock HelpContext for InfoTooltip
vi.mock('../../context/HelpContext', () => ({
  HelpProvider: ({ children }) => <div>{children}</div>,
  useHelp: () => ({ openHelp: vi.fn(), closeHelp: vi.fn() }),
}));

vi.mock('../../components/goals/GoalCard', () => ({
  default: ({ goal, onClick }) => (
    <div data-testid="goal-card" onClick={() => onClick(goal)}>
      {goal.title}
    </div>
  ),
}));

vi.mock('../../components/goals/GoalSummaryWidget', () => ({
  default: () => <div data-testid="summary-widget">Summary Widget</div>,
}));

vi.mock('../../components/goals/SavingsOverviewWidget', () => ({
  default: () => <div data-testid="savings-widget">Savings Widget</div>,
}));

// Mock Filters
vi.mock('../../components/goals/GoalFilters', () => ({
  default: ({ onFilterChange, filters }) => (
    <div data-testid="goal-filters">
      <span>Current Filter: {filters.status}</span>
      <button onClick={() => onFilterChange({ ...filters, status: 'not_started' })}>
        Filter: Not Started
      </button>
    </div>
  ),
}));

// Mock Modal
vi.mock('../../components/goals/GoalDetailModal', () => ({
  default: ({ goal, onClose, onDelete }) => (
    <div data-testid="goal-modal">
      <h2>Editing: {goal.title}</h2>
      <button onClick={onClose}>Close</button>
      <button onClick={() => onDelete(goal._id)}>Delete</button>
    </div>
  ),
}));

describe('GoalsPage', () => {
  const apiGoals = [
    {
      _id: 'api-1',
      title: 'API Goal - Buy House',
      target_date: '2030-01-01',
      current_amount: 1000,
      target_amount: 50000,
      status: 'Active'
    },
    {
      _id: 'api-2',
      title: 'MacBook Pro',
      target_date: '2025-06-01',
      current_amount: 500,
      target_amount: 3000,
      status: 'Active'
    },
    {
      _id: 'api-3',
      title: 'New house',
      target_date: '2035-01-01',
      current_amount: 0,
      target_amount: 100000,
      status: 'Not Started'
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    // Default: Simulation OFF
    SimulationContext.useSimulation.mockReturnValue({ timeOffset: 0, marketMode: 'Neutral' });
    SimulationContext.useSimulatedData.mockReturnValue(null); 

    // Default: API returns list
    goalService.getGoals.mockResolvedValue(apiGoals);
  });

  it('renders correctly and fetches goals', async () => {
    render(
      <MemoryRouter>
        <GoalsPage />
      </MemoryRouter>
    );

    // 1. Check Title
    expect(screen.getByText('My Goals')).toBeInTheDocument();
    expect(screen.getByText('Create New Goal')).toBeInTheDocument();

    // 2. Wait for cards to load
    await waitFor(() => {
      const cards = screen.getAllByTestId('goal-card');
      expect(cards.length).toBeGreaterThan(0);
    });

    expect(screen.getByText('API Goal - Buy House')).toBeInTheDocument(); 
  });

  it('filters goals when filter state changes', async () => {
    render(
      <MemoryRouter>
        <GoalsPage />
      </MemoryRouter>
    );
    await waitFor(() => screen.getAllByTestId('goal-card'));

    // 1. Initial State
    expect(screen.getByText('API Goal - Buy House')).toBeInTheDocument();

    // 2. Click our mock filter button
    fireEvent.click(screen.getByText(/Filter: Not Started/i));

    // 3. Verify filtered list (API Goal is 'Active', so it should disappear)
    await waitFor(() => {
      expect(screen.queryByText('API Goal - Buy House')).not.toBeInTheDocument();
      expect(screen.queryByText('MacBook Pro')).not.toBeInTheDocument();
    });

    // Only "Not Started" goals should be visible
    expect(screen.getByText('New house')).toBeInTheDocument();
  });

  it('opens and closes the detail modal', async () => {
    render(
      <MemoryRouter>
        <GoalsPage />
      </MemoryRouter>
    );
    await waitFor(() => screen.getAllByTestId('goal-card'));

    fireEvent.click(screen.getByText('MacBook Pro'));

    expect(screen.getByTestId('goal-modal')).toBeInTheDocument();
    expect(screen.getByText('Editing: MacBook Pro')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Close'));
    expect(screen.queryByTestId('goal-modal')).not.toBeInTheDocument();
  });

  it('handles goal deletion', async () => {
    // Mock window.confirm to always return true
    vi.spyOn(window, 'confirm').mockImplementation(() => true);

    render(
      <MemoryRouter>
        <GoalsPage />
      </MemoryRouter>
    );
    await waitFor(() => screen.getAllByTestId('goal-card'));

    // 1. Click API Goal
    fireEvent.click(screen.getByText('API Goal - Buy House'));

    // 2. Click Delete in Modal
    fireEvent.click(screen.getByText('Delete'));

    // 3. Verify API was called
    expect(goalService.deleteGoal).toHaveBeenCalledWith('api-1');

    // 4. WAIT for the Modal to close (This is the fix)
    await waitFor(() => {
        expect(screen.queryByTestId('goal-modal')).not.toBeInTheDocument();
    });
  });

  it('displays simulation indicator when timeOffset > 0', async () => {
    // Setup Simulation Mode
    SimulationContext.useSimulation.mockReturnValue({ timeOffset: 5, marketMode: 'Bull' });
    
    // Setup Simulated Data Return
    SimulationContext.useSimulatedData.mockReturnValue({
        goals: [{ _id: 'sim-1', title: 'Future Goal', current_amount: 99999 }]
    });

    render(
      <MemoryRouter>
        <GoalsPage />
      </MemoryRouter>
    );

    // Wait for render
    await waitFor(() => screen.getByTestId('goal-card'));

    expect(screen.getByText(/Simulation Mode/i)).toBeInTheDocument();
    
    // Check that we are rendering the SIMULATED goals
    expect(screen.getByText('Future Goal')).toBeInTheDocument();
    expect(screen.queryByText('MacBook Pro')).not.toBeInTheDocument();
  });
});

