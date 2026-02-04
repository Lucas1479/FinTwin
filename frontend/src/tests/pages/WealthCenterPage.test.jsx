import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import React, { useContext } from 'react';
import WealthCenterPage, { WealthContext } from '../../pages/WealthCenterPage';

// --- 1. MOCK THE CONTEXT ---
import * as SimulationContext from '../../context/SimulationContext';
vi.mock('../../context/SimulationContext', () => ({
  useSimulation: vi.fn(),
  useSimulatedData: vi.fn(),
}));

// --- 2. MOCK THE SERVICES ---
import * as wealthService from '../../services/wealthService';
import * as cashFlowService from '../../services/cashFlowService';
import * as goalService from '../../services/goalService';

vi.mock('../../services/wealthService', () => ({
  getWealthSummary: vi.fn(),
  getAssets: vi.fn(),
}));
vi.mock('../../services/cashFlowService', () => ({
  getCashFlows: vi.fn(),
}));
vi.mock('../../services/goalService', () => ({
  getGoals: vi.fn(),
}));

// --- 3. MOCK CHILD COMPONENTS ---
// We mock these to prove the page handles switching correctly without needing the real charts.

// Mock Overview to test Context wiring (it tries to call onAddAsset)
vi.mock('../../pages/wealth/WealthOverview', () => ({
  default: () => {
    const { onAddAsset, data } = useContext(WealthContext);
    return (
      <div data-testid="wealth-overview">
        <span>Net Worth: {data?.summary?.netWorth}</span>
        <button onClick={onAddAsset}>Trigger Add Asset</button>
      </div>
    );
  },
}));

vi.mock('../../pages/wealth/WealthPortfolio', () => ({
  default: () => <div data-testid="wealth-portfolio">Portfolio View</div>,
}));

vi.mock('../../pages/wealth/WealthCashflow', () => ({
  default: () => <div data-testid="wealth-cashflow">Cashflow View</div>,
}));

vi.mock('../../components/layout/MainLayout', () => ({
  default: ({ children }) => <div data-testid="main-layout">{children}</div>,
}));

// Mock HelpContext for InfoTooltip
vi.mock('../../context/HelpContext', () => ({
  HelpProvider: ({ children }) => <div>{children}</div>,
  useHelp: () => ({ openHelp: vi.fn(), closeHelp: vi.fn() }),
}));

// Mock Modal to check if it receives the isOpen prop
vi.mock('../../components/wealth/AssetFormModal', () => ({
  default: ({ isOpen, onClose }) => (
    isOpen ? (
      <div data-testid="asset-modal">
        Modal is OPEN
        <button onClick={onClose}>Close Modal</button>
      </div>
    ) : <div data-testid="asset-modal-closed" />
  ),
}));

describe('WealthCenterPage', () => {
  const mockSummary = { netWorth: 500000, totalAssets: 600000, totalLiabilities: 100000 };
  const mockAssets = [
    { id: 1, name: 'House', record_type: 'Asset' },
    { id: 2, name: 'Mortgage', record_type: 'Liability' }
  ];
  const mockCashFlows = [];
  const mockGoals = [];

  beforeEach(() => {
    vi.clearAllMocks();

    // Default: Simulation OFF
    SimulationContext.useSimulation.mockReturnValue({ timeOffset: 0, marketMode: 'Neutral' });
    SimulationContext.useSimulatedData.mockReturnValue(null);

    // Default: Services return data
    wealthService.getWealthSummary.mockResolvedValue(mockSummary);
    wealthService.getAssets.mockResolvedValue(mockAssets);
    cashFlowService.getCashFlows.mockResolvedValue(mockCashFlows);
    goalService.getGoals.mockResolvedValue(mockGoals);
  });

  it('renders correctly and fetches initial data', async () => {
    render(
      <MemoryRouter>
        <WealthCenterPage />
      </MemoryRouter>
    );

    // 1. Check title
    expect(screen.getByText('Wealth Center')).toBeInTheDocument();

    // 2. Wait for data to load and Overview to appear (default tab)
    await waitFor(() => expect(screen.getByTestId('wealth-overview')).toBeInTheDocument());

    // 3. Verify data was passed to context (Mock Overview displays Net Worth)
    expect(screen.getByText('Net Worth: 500000')).toBeInTheDocument();
  });

  it('switches tabs correctly', async () => {
    render(
      <MemoryRouter>
        <WealthCenterPage />
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByTestId('wealth-overview')).toBeInTheDocument());

    // Switch to Portfolio
    const portfolioTab = screen.getByText('Portfolio');
    fireEvent.click(portfolioTab);
    expect(screen.getByTestId('wealth-portfolio')).toBeInTheDocument();
    expect(screen.queryByTestId('wealth-overview')).not.toBeInTheDocument();

    // Switch to Cash Flow
    const cashFlowTab = screen.getByText('Cash Flow');
    fireEvent.click(cashFlowTab);
    expect(screen.getByTestId('wealth-cashflow')).toBeInTheDocument();
  });

  it('opens the Add Asset modal when triggered via Context', async () => {
    render(
      <MemoryRouter>
        <WealthCenterPage />
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByTestId('wealth-overview')).toBeInTheDocument());

    // Verify Modal is initially closed (or not present depending on mock logic)
    expect(screen.queryByText('Modal is OPEN')).not.toBeInTheDocument();

    // Click the button inside the child component (WealthOverview) that calls `onAddAsset`
    fireEvent.click(screen.getByText('Trigger Add Asset'));

    // Check if modal appeared
    expect(screen.getByTestId('asset-modal')).toHaveTextContent('Modal is OPEN');
    
    // Close it
    fireEvent.click(screen.getByText('Close Modal'));
    // Depending on your Modal logic, it might take a small timeout or just set state
    await waitFor(() => expect(screen.queryByText('Modal is OPEN')).not.toBeInTheDocument());
  });

  it('displays simulation indicator when timeOffset > 0', async () => {
    // Setup Simulation Mode
    SimulationContext.useSimulation.mockReturnValue({ timeOffset: 10, marketMode: 'Crash' });
    
    // Setup Simulated Data Return
    SimulationContext.useSimulatedData.mockReturnValue({
        wealth: { netWorth: 999000 }
    });

    render(
      <MemoryRouter>
        <WealthCenterPage />
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByTestId('wealth-overview')).toBeInTheDocument());

    // Check Badge
    expect(screen.getByText(/Simulation Mode/i)).toBeInTheDocument();
    
    // Check Projecting Text
    expect(screen.getByText(/Projecting 10 years into the future/i)).toBeInTheDocument();

    // Check if the Context received the SIMULATED data (999000) instead of API data
    expect(screen.getByText('Net Worth: 999000')).toBeInTheDocument();
  });
});

