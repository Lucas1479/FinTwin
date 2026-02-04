import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Copilot from '../../pages/GoalIntakePage'; 
import goalEngineService from '../../services/goalEngineService';
import * as privacyUtils from '../../constants/privacyDataTypes';

// Mock the service
vi.mock('../../services/goalEngineService', () => ({
    generateDecisionStream: vi.fn(),
    default: { generateDecisionStream: vi.fn() }
}));

// Mock the privacy utils directly
vi.mock('../../constants/privacyDataTypes', () => ({
    getRequiredDataTypes: vi.fn(() => ['financial_data']),
    shouldShowPermissionCard: vi.fn(() => true), 
}));

describe('Copilot Integration Tests', () => {
    let user;

    beforeEach(() => {
        vi.clearAllMocks();
        user = userEvent.setup();
    });

    it('triggers privacy card and updates message list', async () => {
        // We MUST provide the state-management props since the component 
        // relies on them to render the list of messages.
        const setMessages = vi.fn();
        const setShowPermissionCard = vi.fn();

        render(
            <Copilot 
                mode="analyze" 
                currentStageLabel="Intake"
                goalContext={{ substage: 'initial', category: 'wealth' }}
                messages={[]} // Start with empty
                setMessages={setMessages}
                setShowPermissionCard={setShowPermissionCard}
            />
        );
        
        const chatInput = screen.getByPlaceholderText(/Ask your AI Copilot/i);
        
        // Use fireEvent for more direct control over the textarea
        fireEvent.change(chatInput, { target: { value: 'Analyze my wealth' } });
        
        const sendBtn = screen.getByLabelText(/Send message/i);
        await user.click(sendBtn);

        // CHECK 1: Did it try to show the permission card?
        await waitFor(() => {
            expect(setShowPermissionCard).toHaveBeenCalledWith(true);
        });

        // CHECK 2: Did it try to add the user message to the list?
        await waitFor(() => {
            expect(setMessages).toHaveBeenCalled();
        });
    });

    it('renders the permission UI when showPermissionCard prop is true', async () => {
        // Test the UI rendering independently of the logic
        render(
            <Copilot 
                showPermissionCard={true} 
                messages={[]}
                requestedDataTypes={['financial_data']}
            />
        );

        expect(screen.getByText(/AI needs access to financial data/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Grant Access/i })).toBeInTheDocument();
    });
});