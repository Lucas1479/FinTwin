/**
 * Stream Response Utilities
 * Helper functions for processing SSE (Server-Sent Events) streaming responses
 */

/**
 * Extract field content from incomplete JSON stream
 * Safely extracts a field value even from incomplete/streaming JSON
 * 
 * @param {string} field - Field name to extract (e.g. 'rationale', 'thought_process')
 * @param {string} jsonStr - Incomplete or complete JSON string
 * @returns {string} Extracted field value with escaped characters resolved
 * 
 * @example
 * const json = '{"rationale": "This is a test\\nwith newline"}';
 * extractField('rationale', json); // Returns: "This is a test\nwith newline"
 */
export const extractField = (field, jsonStr) => {
    const marker = `"${field}": "`;
    const startIdx = jsonStr.indexOf(marker);
    if (startIdx === -1) return '';
    
    const contentStart = startIdx + marker.length;
    let contentEnd = jsonStr.length;
    
    // Track if we are inside an escaped sequence
    let escaped = false;
    for (let i = contentStart; i < jsonStr.length; i++) {
        if (escaped) {
            escaped = false;
            continue;
        }
        if (jsonStr[i] === '\\') {
            escaped = true;
            continue;
        }
        if (jsonStr[i] === '"') {
            contentEnd = i;
            break;
        }
    }
    
    return jsonStr.slice(contentStart, contentEnd)
        .replace(/\\n/g, '\n')
        .replace(/\\"/g, '"')
        .replace(/\\r/g, '')
        .replace(/\\t/g, '\t');
};
