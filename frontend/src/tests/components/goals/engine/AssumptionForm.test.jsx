import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AssumptionForm } from '../../../../components/goals/engine/AssumptionForm';

describe('AssumptionForm', () => {
    it('should render form', () => {
        render(<AssumptionForm />);
        
        expect(screen.getByText('Expected Return (%)')).toBeInTheDocument();
        expect(screen.getByText('Inflation (%)')).toBeInTheDocument();
        expect(screen.getByText('Risk Attitude')).toBeInTheDocument();
        expect(screen.getByText('Cashflow Flexibility')).toBeInTheDocument();
    });

    it('should fill form with initial values', () => {
        const initialValues = {
            expected_return_pct: 8.0,
            inflation_pct: 3.0,
            risk_attitude: 'growth',
            cashflow_flexibility: 'high'
        };
        
        render(<AssumptionForm initialValues={initialValues} />);
        
        const inputs = screen.getAllByRole('spinbutton');
        expect(inputs[0]).toHaveValue(8);
        expect(inputs[1]).toHaveValue(3);
        
        const selects = screen.getAllByRole('combobox');
        expect(selects[0]).toHaveValue('growth');
        expect(selects[1]).toHaveValue('high');
    });

    it('should use default values', () => {
        render(<AssumptionForm />);
        
        const inputs = screen.getAllByRole('spinbutton');
        expect(inputs[0]).toHaveValue(6); // default expected_return_pct
        expect(inputs[1]).toHaveValue(2.5); // default inflation_pct
        
        const selects = screen.getAllByRole('combobox');
        expect(selects[0]).toHaveValue('balanced'); // default risk_attitude
        expect(selects[1]).toHaveValue('medium'); // default cashflow_flexibility
    });

    it('should allow user to input percentage', async () => {
        const user = userEvent.setup();
        render(<AssumptionForm />);
        
        const inputs = screen.getAllByRole('spinbutton');
        const returnInput = inputs[0];
        
        await user.clear(returnInput);
        await user.type(returnInput, '9.5');
        
        expect(returnInput).toHaveValue(9.5);
    });

    it('should call onSubmit when submitting', async () => {
        const onSubmit = vi.fn();
        render(<AssumptionForm onSubmit={onSubmit} />);
        
        const submitButton = screen.getByText('Save & review');
        fireEvent.click(submitButton);
        
        await waitFor(() => {
            expect(onSubmit).toHaveBeenCalledTimes(1);
        });
    });

    it('should call onCancel when cancelling', () => {
        const onCancel = vi.fn();
        render(<AssumptionForm onCancel={onCancel} />);
        
        const cancelButton = screen.getByText('Back to edit');
        fireEvent.click(cancelButton);
        
        expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it('should not show cancel button when onCancel is not provided', () => {
        render(<AssumptionForm />);
        
        expect(screen.queryByText('Back to edit')).not.toBeInTheDocument();
    });

    it('should show risk attitude options', () => {
        render(<AssumptionForm />);
        
        const selects = screen.getAllByRole('combobox');
        const riskSelect = selects[0];
        
        expect(riskSelect).toBeInTheDocument();
        
        // Check options
        const options = Array.from(riskSelect.querySelectorAll('option'));
        const optionValues = options.map(opt => opt.value);
        
        expect(optionValues).toContain('conservative');
        expect(optionValues).toContain('balanced');
        expect(optionValues).toContain('growth');
    });

    it('should show cashflow flexibility options', () => {
        render(<AssumptionForm />);
        
        const selects = screen.getAllByRole('combobox');
        const flexibilitySelect = selects[1];
        
        expect(flexibilitySelect).toBeInTheDocument();
        
        // Check options
        const options = Array.from(flexibilitySelect.querySelectorAll('option'));
        const optionValues = options.map(opt => opt.value);
        
        expect(optionValues).toContain('low');
        expect(optionValues).toContain('medium');
        expect(optionValues).toContain('high');
    });

    it('should allow changing dropdown options', async () => {
        const user = userEvent.setup();
        render(<AssumptionForm />);
        
        const selects = screen.getAllByRole('combobox');
        const riskSelect = selects[0];
        
        await user.selectOptions(riskSelect, 'conservative');
        
        expect(riskSelect).toHaveValue('conservative');
    });

    it('should handle empty initial values', () => {
        render(<AssumptionForm initialValues={{}} />);
        
        const inputs = screen.getAllByRole('spinbutton');
        // Should use default values
        expect(inputs[0]).toHaveValue(6);
        expect(inputs[1]).toHaveValue(2.5);
    });

    it('should support decimal input', async () => {
        const user = userEvent.setup();
        render(<AssumptionForm />);
        
        const inputs = screen.getAllByRole('spinbutton');
        const returnInput = inputs[0];
        
        await user.clear(returnInput);
        await user.type(returnInput, '7.25');
        
        expect(returnInput).toHaveValue(7.25);
    });

    it('should submit correct form data', async () => {
        const onSubmit = vi.fn();
        const user = userEvent.setup();
        
        render(<AssumptionForm onSubmit={onSubmit} />);
        
        const inputs = screen.getAllByRole('spinbutton');
        await user.clear(inputs[0]);
        await user.type(inputs[0], '10');
        
        const submitButton = screen.getByText('Save & review');
        fireEvent.click(submitButton);
        
        await waitFor(() => {
            expect(onSubmit).toHaveBeenCalledWith(
                expect.objectContaining({
                    expected_return_pct: 10
                })
            );
        });
    });

    it('should allow input with step of 0.1', () => {
        render(<AssumptionForm />);
        
        const inputs = screen.getAllByRole('spinbutton');
        
        // Check input step attribute
        expect(inputs[0]).toHaveAttribute('step', '0.1');
        expect(inputs[1]).toHaveAttribute('step', '0.1');
    });
});
