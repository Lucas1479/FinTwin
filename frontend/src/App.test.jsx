import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
// Remove MemoryRouter here if App already provides a Router
import App from './App';

vi.mock('./services/scenarioService', () => ({
  default: { getScenarios: vi.fn().mockResolvedValue([]) }
}));

vi.mock('./hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: '1' }, loading: false })
}));

describe('App Component Smoke Test', () => {
  it('renders without crashing', async () => {
    // If App.jsx contains its own <BrowserRouter>, don't wrap it here
    render(<App />); 
    
    // Check for a generic element that should be there
    expect(document.body).toBeDefined();
  });
});