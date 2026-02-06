import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import Dashboard from '../../pages/Dashboard';

// --- 1. MOCK THE CONTEXT ---
import * as SimulationContext from '../../context/SimulationContext';
vi.mock('../../context/SimulationContext', () => ({
  useSimulation: vi.fn(),
  useSimulatedData: vi.fn(),
}));

// --- 2. MOCK THE SERVICES ---
import * as userService from '../../services/userService';
import * as wealthService from '../../services/wealthService';
import * as goalService from '../../services/goalService';
import * as cashFlowService from '../../services/cashFlowService';

vi.mock('../../services/userService', () => ({ getUserProfile: vi.fn() }));
vi.mock('../../services/wealthService', () => ({ getWealthSummary: vi.fn(), getAssets: vi.fn() }));
vi.mock('../../services/goalService', () => ({ getGoals: vi.fn() }));
vi.mock('../../services/cashFlowService', () => ({ getCashFlows: vi.fn() }));

// --- 3. MOCK THE CHILD WIDGETS & LAYOUT ---
vi.mock('../../components/layout/MainLayout', () => ({
  default: ({ children }) => <div data-testid="main-layout">{children}</div>,
}));
vi.mock('../../components/dashboard/widgets/HealthScoreWidget', () => ({
  default: (props) => <div data-testid="health-widget">Health: {props.netWorth}</div>,
}));
vi.mock('../../components/dashboard/widgets/GoalHeatmapWidget', () => ({
  default: () => <div data-testid="heatmap-widget" />,
}));
vi.mock('../../components/dashboard/widgets/GoalProgressChartWidget', () => ({
  default: () => <div data-testid="progress-widget" />,
}));
vi.mock('../../components/dashboard/widgets/AdvisorPulseWidget', () => ({
  default: () => <div data-testid="advisor-widget" />,
}));
vi.mock('../../components/dashboard/widgets/FundingFlowWidget', () => ({
  default: () => <div data-testid="funding-widget" />,
}));
vi.mock('../../components/dashboard/DigitalTwinCore', () => ({
  default: () => <div data-testid="digital-twin" />,
}));

describe('Dashboard Component', () => {
  const mockData = {
    profile: { name: 'Test User' },
    wealth: { netWorth: 100000, liquidCapital: 50000, totalAssets: 150000, totalLiabilities: 50000 },
    assets: [{ record_type: 'Asset', name: 'House' }],
    goals: [{ id: 1, name: 'Retirement' }],
    cashFlows: [{ id: 1, amount: 500 }]
  };

  beforeEach(() => {
    vi.clearAllMocks();
    SimulationContext.useSimulation.mockReturnValue({ timeOffset: 0, marketMode: 'Neutral' });
    SimulationContext.useSimulatedData.mockReturnValue(null);

    userService.getUserProfile.mockResolvedValue(mockData.profile);
    wealthService.getWealthSummary.mockResolvedValue(mockData.wealth);
    wealthService.getAssets.mockResolvedValue(mockData.assets);
    goalService.getGoals.mockResolvedValue(mockData.goals);
    cashFlowService.getCashFlows.mockResolvedValue(mockData.cashFlows);
  });

  it('shows loading spinner initially', () => {
    userService.getUserProfile.mockImplementation(() => new Promise(() => {}));
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );
    expect(screen.queryByTestId('health-widget')).not.toBeInTheDocument();
  });

  it('fetches data and renders dashboard widgets correctly', async () => {
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    // Wait for data to load
    await waitFor(() => expect(screen.getByTestId('health-widget')).toBeInTheDocument());

    // --- FIX IS HERE ---
    // Instead of getByText (which found multiples), we specifically look for the H1 heading
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Test/i);

    expect(screen.getByText(/digital twin is currently processing/i)).toBeInTheDocument();
    expect(screen.getByTestId('heatmap-widget')).toBeInTheDocument();
    expect(screen.getByTestId('advisor-widget')).toBeInTheDocument();
    expect(screen.getByText('Health: 100000')).toBeInTheDocument();
  });

  it('activates Simulation Mode UI when timeOffset > 0', async () => {
    SimulationContext.useSimulation.mockReturnValue({ timeOffset: 5, marketMode: 'Bull' });
    SimulationContext.useSimulatedData.mockReturnValue({
        wealth: { netWorth: 999999, liquidCapital: 0, totalAssets: 0, totalLiabilities: 0 },
        assets: [],
        goals: []
    });

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByTestId('health-widget')).toBeInTheDocument());
    expect(screen.getByText(/Simulation Mode/i)).toBeInTheDocument();
    expect(screen.getByText(/Simulating 5 years into the future/i)).toBeInTheDocument();
    expect(screen.getByText('Health: 999999')).toBeInTheDocument();
  });

  it('uses fallback data gracefully if API fails', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    wealthService.getWealthSummary.mockRejectedValue(new Error('Network Error'));

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByTestId('health-widget')).toBeInTheDocument());
    expect(screen.getByText('Health: 154000')).toBeInTheDocument();
    consoleSpy.mockRestore();
  });
});

