import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConfirmedCard } from '../../../../components/goals/engine/ConfirmedCard';

describe('ConfirmedCard', () => {
    const mockDataLines = [
        { label: 'Monthly Income', value: '$5,000' },
        { label: 'Liquid Assets', value: '$10,000' },
        { label: 'Investments', value: '$50,000' }
    ];

    it('should render card title', () => {
        render(
            <ConfirmedCard 
                title="Financial Status" 
                dataLines={mockDataLines}
                isExpanded={false}
            />
        );
        
        expect(screen.getByText('Financial Status')).toBeInTheDocument();
    });

    it('should show all data lines when expanded', () => {
        render(
            <ConfirmedCard 
                title="Financial Status" 
                dataLines={mockDataLines}
                isExpanded={true}
            />
        );
        
        expect(screen.getByText('Monthly Income')).toBeInTheDocument();
        expect(screen.getByText('$5,000')).toBeInTheDocument();
        expect(screen.getByText('Liquid Assets')).toBeInTheDocument();
        expect(screen.getByText('$10,000')).toBeInTheDocument();
    });

    it('should hide data lines when collapsed', () => {
        render(
            <ConfirmedCard 
                title="Financial Status" 
                dataLines={mockDataLines}
                isExpanded={false}
            />
        );
        
        expect(screen.queryByText('Monthly Income')).not.toBeInTheDocument();
        expect(screen.queryByText('$5,000')).not.toBeInTheDocument();
    });

    it('should show confirmed status icon', () => {
        const { container } = render(
            <ConfirmedCard 
                title="Financial Status" 
                dataLines={mockDataLines}
                isExpanded={false}
            />
        );
        
        // CheckCircle2 icon should exist
        expect(container.querySelector('.text-green-600')).toBeInTheDocument();
    });

    it('should show confirmed status text', () => {
        render(
            <ConfirmedCard 
                title="Financial Status" 
                dataLines={mockDataLines}
                isExpanded={false}
            />
        );
        
        expect(screen.getByText(/Confirmed/i)).toBeInTheDocument();
    });

    it('should call onEdit when edit button is clicked', () => {
        const onEdit = vi.fn();
        
        render(
            <ConfirmedCard 
                title="Financial Status" 
                dataLines={mockDataLines}
                onEdit={onEdit}
                isExpanded={false}
            />
        );
        
        const editButton = screen.getByTitle('Edit');
        fireEvent.click(editButton);
        
        expect(onEdit).toHaveBeenCalledTimes(1);
    });

    it('should call onToggle when toggle button is clicked', () => {
        const onToggle = vi.fn();
        
        render(
            <ConfirmedCard 
                title="Financial Status" 
                dataLines={mockDataLines}
                onToggle={onToggle}
                isExpanded={false}
            />
        );
        
        const toggleButton = screen.getByTitle('Expand');
        fireEvent.click(toggleButton);
        
        expect(onToggle).toHaveBeenCalledTimes(1);
    });

    it('should show different toggle button titles based on expanded state', () => {
        const { rerender } = render(
            <ConfirmedCard 
                title="Financial Status" 
                dataLines={mockDataLines}
                onToggle={vi.fn()}
                isExpanded={false}
            />
        );
        
        expect(screen.getByTitle('Expand')).toBeInTheDocument();
        
        rerender(
            <ConfirmedCard 
                title="Financial Status" 
                dataLines={mockDataLines}
                onToggle={vi.fn()}
                isExpanded={true}
            />
        );
        
        expect(screen.getByTitle('Collapse')).toBeInTheDocument();
    });

    it('should not show edit button when onEdit is not provided', () => {
        render(
            <ConfirmedCard 
                title="Financial Status" 
                dataLines={mockDataLines}
                isExpanded={false}
            />
        );
        
        expect(screen.queryByTitle('Edit')).not.toBeInTheDocument();
    });

    it('should not show toggle button when onToggle is not provided', () => {
        render(
            <ConfirmedCard 
                title="Financial Status" 
                dataLines={mockDataLines}
                onEdit={vi.fn()}
                isExpanded={false}
            />
        );
        
        expect(screen.queryByTitle('Expand')).not.toBeInTheDocument();
        expect(screen.queryByTitle('Collapse')).not.toBeInTheDocument();
    });

    it('should handle empty data lines', () => {
        render(
            <ConfirmedCard 
                title="Financial Status" 
                dataLines={[]}
                isExpanded={true}
            />
        );
        
        expect(screen.getByText('Financial Status')).toBeInTheDocument();
        // Should not have data area when empty
    });

    it('should handle numeric values', () => {
        const dataLines = [
            { label: 'Age', value: 35 },
            { label: 'Years', value: 10 }
        ];
        
        render(
            <ConfirmedCard 
                title="Profile" 
                dataLines={dataLines}
                isExpanded={true}
            />
        );
        
        expect(screen.getByText('35')).toBeInTheDocument();
        expect(screen.getByText('10')).toBeInTheDocument();
    });
});
