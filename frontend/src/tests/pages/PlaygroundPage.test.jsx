import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import PlaygroundPage from '../../pages/PlaygroundPage';
import * as playgroundService from '../../services/playgroundService';
import * as goalService from '../../services/goalService';

// --- MOCKS ---

// 1. Mock Layout
vi.mock('../../components/layout/MainLayout', () => ({
  default: ({ children }) => <div data-testid="main-layout">{children}</div>,
}));

// Mock HelpContext for InfoTooltip
vi.mock('../../context/HelpContext', () => ({
  HelpProvider: ({ children }) => <div>{children}</div>,
  useHelp: () => ({ openHelp: vi.fn(), closeHelp: vi.fn() }),
}));

// 2. Mock Child Components
// We add buttons to these mocks to trigger the parent's event handlers easily
vi.mock('../../pages/Playground/PlaygroundLobby', () => ({
  default: ({ onEditSimulation, onCreateSimulation, simulations = [] }) => (
    <div data-testid="scenario-lobby">
      <h1>Lobby View</h1>
      <span data-testid="scenario-count">{(simulations || []).length}</span>
      <button onClick={() => onCreateSimulation && onCreateSimulation({ name: 'New Test Sim', profileId: 'p1' })}>
        Trigger Create
      </button>
      <button onClick={() => onEditSimulation && onEditSimulation('sim-1')}>
        Trigger Edit
      </button>
    </div>
  ),
}));

vi.mock('../../pages/Playground/SimulationWorkspace', () => ({
  default: ({ onBack, simulationId }) => (
    <div data-testid="scenario-workspace">
      <h1>Workspace View: {simulationId}</h1>
      <button onClick={onBack}>Go Back</button>
    </div>
  ),
}));

// 3. Mock Tools
vi.mock('../../pages/Playground/PlaygroundTools', () => ({
  CalculatorModal: ({ isOpen, calculatorType, onClose }) => (
    isOpen ? (
      <div data-testid="calculator-modal">
        <p>Type: {calculatorType}</p>
        <button onClick={onClose}>Close Modal</button>
      </div>
    ) : null
  ),
  default: () => <div />,
}));

// 4. Mock Services
vi.mock('../../services/playgroundService');
vi.mock('../../services/goalService');

describe('PlaygroundPage', () => {
  const mockScenarios = [
    { _id: 'sim-1', name: 'Retirement Plan', background: 'p1', results: {} },
    { _id: 'sim-2', name: 'House Buy', background: 'p1', results: {} }
  ];
  
  const mockBackgrounds = [
    { _id: 'p1', name: 'Default Profile' }
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default successful responses
    goalService.getGoals.mockResolvedValue([]);
    playgroundService.getBackgrounds.mockResolvedValue(mockBackgrounds);
    playgroundService.getSimulations.mockResolvedValue(mockScenarios);
    
    // Setup Create response
    playgroundService.createSimulation.mockResolvedValue({
      _id: 'sim-new',
      name: 'New Test Sim',
      background: 'p1',
      parameters: {},
      results: {}
    });
  });

  it('renders the page and loads initial data', async () => {
    render(<PlaygroundPage />);

    // Check Header
    expect(screen.getByText('Playground')).toBeInTheDocument();

    // Wait for data to load and Lobby to appear
    await waitFor(() => {
      expect(screen.getByTestId('scenario-lobby')).toBeInTheDocument();
    });

    // Check if services were called
    expect(goalService.getGoals).toHaveBeenCalled();
    expect(playgroundService.getSimulations).toHaveBeenCalled();
    
    // Wait for data to be passed to Lobby (simulations prop should be populated)
    await waitFor(() => {
      const countElement = screen.getByTestId('scenario-count');
      expect(countElement).toHaveTextContent('2');
    }, { timeout: 2000 });
  });

  it('switches between Simulations and Tools tabs', async () => {
    render(<PlaygroundPage />);

    // Default is Simulations
    await waitFor(() => expect(screen.getByTestId('scenario-lobby')).toBeInTheDocument());

    // Switch to Tools
    const toolsTab = screen.getByText('Tools');
    fireEvent.click(toolsTab);

    // Check Tools content appears
    expect(screen.getByText('Mortgage Calculator')).toBeInTheDocument();
    expect(screen.queryByTestId('scenario-lobby')).not.toBeInTheDocument();

    // Switch back
    const simTab = screen.getByText('Simulations');
    fireEvent.click(simTab);
    expect(screen.getByTestId('scenario-lobby')).toBeInTheDocument();
  });

  it('navigates to ScenarioWorkspace when editing a scenario', async () => {
    render(<PlaygroundPage />);
    await waitFor(() => expect(screen.getByTestId('scenario-lobby')).toBeInTheDocument());

    // Click the "Edit" trigger in our mocked Lobby
    await act(async () => {
      fireEvent.click(screen.getByText('Trigger Edit'));
    });

    // Lobby should disappear, Workspace should appear
    await waitFor(() => {
      expect(screen.queryByTestId('scenario-lobby')).not.toBeInTheDocument();
      expect(screen.getByTestId('scenario-workspace')).toBeInTheDocument();
    });
    expect(screen.getByText('Workspace View: sim-1')).toBeInTheDocument();
  });

  it('returns to Lobby when "Back" is clicked in Workspace', async () => {
    render(<PlaygroundPage />);
    
    // Go to workspace
    await waitFor(() => expect(screen.getByTestId('scenario-lobby')).toBeInTheDocument());
    await act(async () => {
      fireEvent.click(screen.getByText('Trigger Edit'));
    });
    await waitFor(() => {
      expect(screen.getByTestId('scenario-workspace')).toBeInTheDocument();
    });

    // Click Back
    await act(async () => {
      fireEvent.click(screen.getByText('Go Back'));
    });

    // Should be back at Lobby
    await waitFor(() => {
      expect(screen.getByTestId('scenario-lobby')).toBeInTheDocument();
      expect(screen.queryByTestId('scenario-workspace')).not.toBeInTheDocument();
    });
  });

  it('handles creating a new scenario via the service', async () => {
    render(<PlaygroundPage />);
    await waitFor(() => expect(screen.getByTestId('scenario-lobby')).toBeInTheDocument());

    // Trigger creation via mock button
    await act(async () => {
      fireEvent.click(screen.getByText('Trigger Create'));
    });

    // Check service call - wait for async operation
    await waitFor(() => {
      expect(playgroundService.createSimulation).toHaveBeenCalled();
    }, { timeout: 2000 });

    // We verify the service was called with the data from our mock button
    expect(playgroundService.createSimulation).toHaveBeenCalledWith(expect.objectContaining({
      name: 'New Test Sim',
    }));
  });

  it('opens and closes the calculator tool modal', async () => {
    render(<PlaygroundPage />);
    
    // Go to Tools
    fireEvent.click(screen.getByText('Tools'));

    // Click Mortgage Card
    const mortgageCard = screen.getByText('Mortgage Calculator').closest('div');
    fireEvent.click(mortgageCard);

    // Modal should appear
    expect(screen.getByTestId('calculator-modal')).toBeInTheDocument();
    expect(screen.getByText('Type: mortgage')).toBeInTheDocument();

    // Close Modal
    fireEvent.click(screen.getByText('Close Modal'));
    expect(screen.queryByTestId('calculator-modal')).not.toBeInTheDocument();
  });
});

