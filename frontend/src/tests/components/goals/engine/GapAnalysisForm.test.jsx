import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GapAnalysisForm } from '../../../../components/goals/engine/GapAnalysisForm';

describe('GapAnalysisForm', () => {
    it('should render form', () => {
        render(<GapAnalysisForm />);
        
        expect(screen.getByText('Monthly Income')).toBeInTheDocument();
        expect(screen.getByText('Liquid Assets')).toBeInTheDocument();
        expect(screen.getByText('Investments')).toBeInTheDocument();
        expect(screen.getByText('Debt / Loans')).toBeInTheDocument();
        expect(screen.getByText('Policy / Tax Constraints')).toBeInTheDocument();
    });

    it('should fill form with initial values', () => {
        const initialValues = {
            monthly_income: '8000',
            liquid_assets: '10000',
            investments: '50000',
            debts: '20000',
            region_policy: 'New Zealand'
        };
        
        render(<GapAnalysisForm initialValues={initialValues} />);
        
        const inputs = screen.getAllByRole('spinbutton');
        expect(inputs[0]).toHaveValue(8000);
        expect(inputs[1]).toHaveValue(10000);
        expect(inputs[2]).toHaveValue(50000);
        expect(inputs[3]).toHaveValue(20000);
        
        const textarea = screen.getByRole('textbox');
        expect(textarea).toHaveValue('New Zealand');
    });

    it('should use empty string as default values', () => {
        render(<GapAnalysisForm />);
        
        const inputs = screen.getAllByRole('spinbutton');
        inputs.forEach(input => {
            expect(input).toHaveValue(null);
        });
    });

    it('should allow user to input numeric values', async () => {
        const user = userEvent.setup();
        render(<GapAnalysisForm />);
        
        const inputs = screen.getAllByRole('spinbutton');
        const incomeInput = inputs[0];
        
        await user.type(incomeInput, '12000');
        
        expect(incomeInput).toHaveValue(12000);
    });

    it('should call onSubmit when submitting', async () => {
        const onSubmit = vi.fn();
        render(<GapAnalysisForm onSubmit={onSubmit} />);
        
        const submitButton = screen.getByText('Save & review');
        fireEvent.click(submitButton);
        
        await waitFor(() => {
            expect(onSubmit).toHaveBeenCalledTimes(1);
        });
    });

    it('should call onCancel when cancelling', async () => {
        const onCancel = vi.fn();
        render(<GapAnalysisForm onCancel={onCancel} />);
        
        const cancelButton = await screen.findByText('Back to edit');
        fireEvent.click(cancelButton);
        
        await waitFor(() => {
            expect(onCancel).toHaveBeenCalledTimes(1);
        });
    });

    it('should not show cancel button when onCancel is not provided', async () => {
        render(<GapAnalysisForm />);
        
        await waitFor(() => {
            expect(screen.queryByText('Back to edit')).toBeNull();
        });
    });

    it('should handle empty initial values', () => {
        render(<GapAnalysisForm initialValues={{}} />);
        
        const inputs = screen.getAllByRole('spinbutton');
        inputs.forEach(input => {
            expect(input).toHaveValue(null);
        });
    });

    it('should show placeholder tips', () => {
        render(<GapAnalysisForm />);
        
        expect(screen.getByPlaceholderText('e.g., 12000')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Cash / short-term holdings')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Funds / stocks / pension')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Mortgage / auto / credit')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Region, tax benefits, regulatory constraints')).toBeInTheDocument();
    });

    it('should support keyboard navigation', async () => {
        const user = userEvent.setup();
        render(<GapAnalysisForm />);
        
        const inputs = screen.getAllByRole('spinbutton');
        const firstInput = inputs[0];
        
        firstInput.focus();
        await user.keyboard('{Tab}');
        
        // Second input should get focus
        expect(inputs[1]).toHaveFocus();
    });

    it('should submit correct form data', async () => {
        const onSubmit = vi.fn();
        const user = userEvent.setup();
        
        render(<GapAnalysisForm onSubmit={onSubmit} />);
        
        const inputs = screen.getAllByRole('spinbutton');
        await user.type(inputs[0], '5000');
        await user.type(inputs[1], '10000');
        
        const submitButton = screen.getByText('Save & review');
        fireEvent.click(submitButton);
        
        await waitFor(() => {
            expect(onSubmit).toHaveBeenCalledWith(
                expect.objectContaining({
                    monthly_income: '5000',
                    liquid_assets: '10000'
                })
            );
        });
    });

    it('should handle textarea input', async () => {
        const user = userEvent.setup();
        render(<GapAnalysisForm />);
        
        const textarea = screen.getByRole('textbox');
        await user.type(textarea, 'Test policy constraints');
        
        expect(textarea).toHaveValue('Test policy constraints');
    });

    it('should correctly update all fields', async () => {
        const onSubmit = vi.fn();
        const user = userEvent.setup();
        
        render(<GapAnalysisForm onSubmit={onSubmit} />);
        
        const inputs = screen.getAllByRole('spinbutton');
        await user.type(inputs[0], '8000');
        await user.type(inputs[1], '15000');
        await user.type(inputs[2], '60000');
        await user.type(inputs[3], '25000');
        
        const textarea = screen.getByRole('textbox');
        await user.type(textarea, 'Auckland, NZ');
        
        const submitButton = screen.getByText('Save & review');
        fireEvent.click(submitButton);
        
        await waitFor(() => {
            expect(onSubmit).toHaveBeenCalledWith({
                monthly_income: '8000',
                liquid_assets: '15000',
                investments: '60000',
                debts: '25000',
                region_policy: 'Auckland, NZ'
            });
        });
    });
});
