import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import LandingPage from '../../pages/LandingPage';

// --- MOCKS ---
vi.mock('../../components/landing/Navbar', () => ({
  default: () => <nav data-testid="mock-navbar">Navbar</nav>,
}));

vi.mock('../../components/landing/HeroSection', () => ({
  default: () => <section data-testid="mock-hero">Hero Section</section>,
}));

vi.mock('../../components/landing/FeaturesSection', () => ({
  default: () => <section data-testid="mock-features">Features Section</section>,
}));

vi.mock('../../components/landing/Footer', () => ({
  default: () => <footer data-testid="mock-footer">Footer</footer>,
}));

describe('LandingPage', () => {
  it('renders all main sections correctly', () => {
    render(<LandingPage />);

    // Verify all child components are present
    expect(screen.getByTestId('mock-navbar')).toBeInTheDocument();
    expect(screen.getByTestId('mock-hero')).toBeInTheDocument();
    expect(screen.getByTestId('mock-features')).toBeInTheDocument();
    expect(screen.getByTestId('mock-footer')).toBeInTheDocument();
  });

  it('renders the styling and background elements', () => {
    const { container } = render(<LandingPage />);

    // Check for the inline style tag
    // Note: React might merge style tags, but it should exist in the container
    expect(container.querySelector('style')).toBeInTheDocument();

    // Check for the background pattern div
    // We look for the specific class we added for the dot pattern
    const patternDiv = container.querySelector('.bg-dot-pattern');
    expect(patternDiv).toBeInTheDocument();
    expect(patternDiv).toHaveClass('absolute', 'inset-0');
  });
});

