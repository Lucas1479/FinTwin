// Simple in-memory logger for MVP debugging
const memoryLogs = [];

export const logDecision = (logEntry) => {
    const entry = {
        timestamp: new Date().toISOString(),
        ...logEntry
    };
    memoryLogs.push(entry);
    // Keep only last 50 logs to prevent overflow
    if (memoryLogs.length > 50) memoryLogs.shift();
    
    if (process.env.NODE_ENV !== 'production') {
        console.log('[GoalEngineLog]', JSON.stringify(entry, null, 2));
    }
};

export const getLogs = () => memoryLogs;

