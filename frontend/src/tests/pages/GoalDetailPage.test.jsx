import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import GoalDetailPage from '../../pages/GoalDetailPage';
import * as goalService from '../../services/goalService';
import * as wealthService from '../../services/wealthService';
import * as cashFlowService from '../../services/cashFlowService';
import * as simulationContext from '../../context/SimulationContext';

// --- FIXED MOCKS ---

vi.mock('../../components/layout/MainLayout', () => ({
  default: ({ children }) => <div data-testid="main-layout">{children}</div>
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return { 
    ...actual, 
    useNavigate: () => mockNavigate, 
    useParams: () => ({ id: 'goal-123' }) 
  };
});

vi.mock('../../services/goalService');
vi.mock('../../services/wealthService');
vi.mock('../../services/cashFlowService');
vi.mock('../../context/SimulationContext', () => ({ 
  useSimulation: vi.fn(), 
  useSimulatedData: vi.fn() 
}));

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }) => <div>{children}</div>,
  PieChart: ({ children }) => <div>{children}</div>,
  Pie: ({ children }) => <div>{children}</div>,
  Cell: () => <div />,
  AreaChart: () => <div />,
  LineChart: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  Tooltip: () => <div />,
}));

const mockGoal = {
  _id: 'goal-123',
  goal_name: 'Retirement 2050',
  target_amount: 1000000,
  current_amount: 50000,
  category: 'Retirement',
  status: 'active',
  plan: {
    strategy_profile: 'Growth',
    selected_portfolio: {
      option_name: 'High Growth Portfolio',
      total_fees_estimate: 0.45,
      products: [
        {
          name: 'Global Growth Fund', 
          product_id: { _id: 'prod-1', name: 'Global Growth Fund', provider: 'Vanguard', fees: "0.4%", returns: "8.5%" },
          weight_pct: 60,
          rationale: 'Core holding'
        }
      ]
    },
    contribution_strategy: { monthly_amount: 500 },
    glide_path: { enabled: true, start_years_before_goal: 10 },
    settings: { inflation_adjusted: true }
  },
  goal_details: { property_price: 1200000 }
};

const mockAssets = [{ 
  _id: 'asset-1', 
  name: 'Global Growth Fund',
  value: 50000, 
  source_product_id: 'prod-1',
  asset_details: { linked_goal_id: 'goal-123' } 
}];

describe('GoalDetailPage', () => {
  let user;

  beforeEach(() => {
    vi.clearAllMocks();
    user = userEvent.setup();
    
    vi.mocked(goalService.getGoalWithPlan).mockResolvedValue(mockGoal);
    vi.mocked(wealthService.getAssets).mockResolvedValue(mockAssets);
    vi.mocked(cashFlowService.getCashFlows).mockResolvedValue([]);
    vi.mocked(goalService.getDecisionLogsForGoal).mockResolvedValue([]);
    
    vi.mocked(simulationContext.useSimulation).mockReturnValue({ timeOffset: 0, marketMode: 'Neutral' });
    vi.mocked(simulationContext.useSimulatedData).mockReturnValue({ goals: [mockGoal], assets: mockAssets });
  });

  const renderComponent = () => render(
    <MemoryRouter initialEntries={['/goals/goal-123']}>
      <Routes>
        <Route path="/goals/:id" element={<GoalDetailPage />} />
      </Routes>
    </MemoryRouter>
  );

  it('renders goal overview correctly after data load', async () => {
    renderComponent();
    expect(await screen.findByText('Retirement 2050')).toBeInTheDocument();
    
    // Select first instance to avoid "Multiple elements found"
    expect(screen.getAllByText(/Retirement/i)[0]).toBeInTheDocument();
    expect(screen.getAllByText(/active/i)[0]).toBeInTheDocument();
    expect(screen.getAllByText(/\$50,000/)[0]).toBeInTheDocument();
  });

  it('opens Product Detail Panel when clicking a product', async () => {
    renderComponent();
    await screen.findByText('Retirement 2050');
    
    // Using a broad search for the button name to be safe
    const holdingsTab = screen.getByRole('button', { name: /Holdings|Plan/i });
    await user.click(holdingsTab);

    // Click the specific product fund
    const productCard = await screen.findByText('Global Growth Fund');
    await user.click(productCard);

    // FIX: Using findAllByText because Vanguard exists in both the card and the detail panel
    const vanguardLabels = await screen.findAllByText(/Vanguard/i);
    expect(vanguardLabels.length).toBeGreaterThan(0);
    
    // Confirm unique rationale text from the detail panel is visible
    expect(screen.getByText(/Core holding/i)).toBeInTheDocument();
  });

  it('switches to Strategy tab and displays details', async () => {
    renderComponent();
    await screen.findByText('Retirement 2050');
    
    const strategyTab = screen.getByRole('button', { name: /Strategy/i });
    await user.click(strategyTab);

    expect(await screen.findByText(/Contribution Strategy/i)).toBeInTheDocument();
    expect(screen.getAllByText(/\$500/)[0]).toBeInTheDocument();
  });

  it('handles simulation mode updates', async () => {
    vi.mocked(simulationContext.useSimulation).mockReturnValue({ timeOffset: 5, marketMode: 'Bull' });
    vi.mocked(simulationContext.useSimulatedData).mockReturnValue({
      goals: [{ ...mockGoal, current_amount: 88888 }],
      assets: [{ ...mockAssets[0], value: 88888 }],
    });

    renderComponent();
    await screen.findByText('Retirement 2050');
    
    await waitFor(() => {
      expect(screen.getByText(/Sim Mode/i)).toBeInTheDocument();
    });
    
    expect(screen.getAllByText(/88,888/)[0]).toBeInTheDocument();
  });
});