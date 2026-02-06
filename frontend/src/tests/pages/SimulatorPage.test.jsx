import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import SimulatorPage from '../../pages/SimulatorPage';

// Mock MainLayout to focus on the page content
vi.mock('../../components/layout/MainLayout', () => ({
  default: ({ children }) => <div data-testid="mock-layout">{children}</div>,
}));

describe('SimulatorPage', () => {
  it('renders the coming soon content correctly', () => {
    render(<SimulatorPage />);

    // Check Main Heading
    expect(screen.getByRole('heading', { level: 1, name: /Digital Twin/i })).toBeInTheDocument();

    // Check Description
    expect(screen.getByText(/Visualize your future wealth/i)).toBeInTheDocument();

    // Check "Coming Soon" Badge
    expect(screen.getByText('Coming Soon - Module 3')).toBeInTheDocument();
  });
});

