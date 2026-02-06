import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SubstageStepIndicator } from '../../../../components/goals/engine/SubstageStepIndicator';

describe('SubstageStepIndicator', () => {
    it('should render all step dots', () => {
        const config = [
            { id: 'step1', label: 'Step 1' },
            { id: 'step2', label: 'Step 2' },
            { id: 'step3', label: 'Step 3' }
        ];
        const state = {
            currentIndex: 0,
            statusById: {}
        };

        const { container } = render(<SubstageStepIndicator config={config} state={state} />);
        
        // Should render 3 dots
        const dots = container.querySelectorAll('.rounded-full');
        expect(dots).toHaveLength(3);
    });

    it('should highlight current step', () => {
        const config = [
            { id: 'step1', label: 'Step 1' },
            { id: 'step2', label: 'Step 2' }
        ];
        const state = {
            currentIndex: 1,
            statusById: {}
        };

        const { container } = render(<SubstageStepIndicator config={config} state={state} />);
        
        const dots = container.querySelectorAll('.rounded-full');
        // Second dot should have black background (current step)
        expect(dots[1].className).toContain('bg-slate-900');
    });

    it('should show green marker for confirmed steps', () => {
        const config = [
            { id: 'step1', label: 'Step 1' },
            { id: 'step2', label: 'Step 2' }
        ];
        const state = {
            currentIndex: 1,
            statusById: {
                'step1': 'confirmed'
            }
        };

        const { container } = render(<SubstageStepIndicator config={config} state={state} />);
        
        const dots = container.querySelectorAll('.rounded-full');
        // First dot should have green border (confirmed)
        expect(dots[0].className).toContain('border-green-500');
    });

    it('should render connecting lines', () => {
        const config = [
            { id: 'step1', label: 'Step 1' },
            { id: 'step2', label: 'Step 2' },
            { id: 'step3', label: 'Step 3' }
        ];
        const state = {
            currentIndex: 0,
            statusById: {}
        };

        const { container } = render(<SubstageStepIndicator config={config} state={state} />);
        
        // Should render 2 connecting lines (n-1 lines)
        const lines = container.querySelectorAll('.h-0\\.5');
        expect(lines).toHaveLength(2);
    });

    it('connecting line of confirmed step should be green', () => {
        const config = [
            { id: 'step1', label: 'Step 1' },
            { id: 'step2', label: 'Step 2' }
        ];
        const state = {
            currentIndex: 1,
            statusById: {
                'step1': 'confirmed'
            }
        };

        const { container } = render(<SubstageStepIndicator config={config} state={state} />);
        
        const lines = container.querySelectorAll('.h-0\\.5');
        // First connecting line should be green
        expect(lines[0].className).toContain('bg-green-400');
    });

    it('should handle case with no state', () => {
        const config = [
            { id: 'step1', label: 'Step 1' }
        ];

        const { container } = render(<SubstageStepIndicator config={config} state={null} />);
        
        const dots = container.querySelectorAll('.rounded-full');
        expect(dots).toHaveLength(1);
    });

    it('should support single step', () => {
        const config = [
            { id: 'single', label: 'Single Step' }
        ];
        const state = {
            currentIndex: 0,
            statusById: {}
        };

        const { container } = render(<SubstageStepIndicator config={config} state={state} />);
        
        const dots = container.querySelectorAll('.rounded-full');
        expect(dots).toHaveLength(1);
        
        // Single step should not have connecting lines
        const lines = container.querySelectorAll('.h-0\\.5');
        expect(lines).toHaveLength(0);
    });

    it('should handle empty configuration', () => {
        const { container } = render(<SubstageStepIndicator config={[]} state={null} />);
        
        const dots = container.querySelectorAll('.rounded-full');
        expect(dots).toHaveLength(0);
    });

    it('should correctly display multiple confirmed steps', () => {
        const config = [
            { id: 'step1', label: 'Step 1' },
            { id: 'step2', label: 'Step 2' },
            { id: 'step3', label: 'Step 3' }
        ];
        const state = {
            currentIndex: 2,
            statusById: {
                'step1': 'confirmed',
                'step2': 'confirmed'
            }
        };

        const { container } = render(<SubstageStepIndicator config={config} state={state} />);
        
        const dots = container.querySelectorAll('.rounded-full');
        
        // First two dots should have green border
        expect(dots[0].className).toContain('border-green-500');
        expect(dots[1].className).toContain('border-green-500');
        // Third dot is current step
        expect(dots[2].className).toContain('bg-slate-900');
    });

    it('should display step label (visible on hover)', () => {
        const config = [
            { id: 'step1', label: 'Financial Status' }
        ];
        const state = {
            currentIndex: 0,
            statusById: {}
        };

        const { container } = render(<SubstageStepIndicator config={config} state={state} />);
        
        // Label should be in DOM, even if opacity-0
        expect(container.textContent).toContain('Financial Status');
    });
});
