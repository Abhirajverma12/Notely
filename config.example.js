// Example configuration file
// Copy this file to config.js and add your actual API key

const CONFIG = {
    GROQ_API_KEY: 'YOUR_GROQ_API_KEY_HERE' // Replace with your actual API key from Groq Console
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
} 