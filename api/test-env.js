export default async function handler(req, res) {
  const API_KEY = process.env.GROQ_API_KEY;
  
  return res.status(200).json({
    message: 'Environment variable test',
    hasApiKey: !!API_KEY,
    apiKeyLength: API_KEY ? API_KEY.length : 0,
    apiKeyPrefix: API_KEY ? API_KEY.substring(0, 10) + '...' : 'Not set'
  });
} 