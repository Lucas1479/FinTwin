import React, { createContext, useContext, useState, useMemo } from 'react';
import { evolveFinancials } from '../utils/evolutionEngine';

const SimulationContext = createContext();

export const SimulationProvider = ({ children }) => {
    const [timeOffset, setTimeOffset] = useState(0); // Years
    const [marketMode, setMarketMode] = useState('Neutral'); // 'Bull', 'Bear', 'Neutral'

    const isSimulationMode = timeOffset > 0;

    const value = {
        timeOffset,
        setTimeOffset,
        marketMode,
        setMarketMode,
        isSimulationMode
    };

    return (
        <SimulationContext.Provider value={value}>
            {children}
        </SimulationContext.Provider>
    );
};

export const useSimulation = () => {
    const context = useContext(SimulationContext);
    if (!context) {
        // 兜底：如果组件未被 Provider 包裹，避免整页崩溃，返回安全默认值
        console.warn('useSimulation called outside SimulationProvider, falling back to defaults');
        return {
            timeOffset: 0,
            setTimeOffset: () => {},
            marketMode: 'Neutral',
            setMarketMode: () => {},
            isSimulationMode: false
        };
    }
    return context;
};

/**
 * Hook to automatically evolve data based on global simulation state
 * 
 * @param {Object} rawData - { assets, goals, cashFlows, wealth }
 * @returns {Object} Evolved data or original data
 */
export const useSimulatedData = (rawData) => {
    const { timeOffset, marketMode } = useSimulation();

    return useMemo(() => {
        if (timeOffset === 0 || !rawData) return rawData;

        // Apply evolution engine
        const evolved = evolveFinancials(
            { 
                assets: rawData.assets || [], 
                liabilities: rawData.liabilities || [],
                cashFlows: rawData.cashFlows || [], 
                goals: rawData.goals || [] 
            },
            timeOffset * 12,
            marketMode
        );

        return {
            ...rawData,
            ...evolved,
            isSimulated: true,
            originalData: rawData
        };
    }, [timeOffset, marketMode, rawData]);
};
