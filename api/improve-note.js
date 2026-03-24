export default async function handler(req, res) {
  console.log('API endpoint called:', req.method, req.url);
  
  if (req.method !== 'POST') {
    console.log('Method not allowed:', req.method);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { content } = req.body;
    console.log('Received content length:', content ? content.length : 0);
    
    if (!content) {
      console.log('No content provided');
      return res.status(400).json({ error: 'Content is required' });
    }

    const API_KEY = process.env.GROQ_API_KEY;
    console.log('API key exists:', !!API_KEY);
    
    if (!API_KEY) {
      console.log('API key not configured');
      return res.status(500).json({ error: 'API key not configured. Please check environment variables.' });
    }

    const API_URL = 'https://api.groq.com/openai/v1/chat/completions';
    const prompt = `Please improve the following text for better grammar, clarity, and readability. Keep the original meaning and tone, but make it more polished and professional. Here's the text:\n\n"${content}"\n\nPlease return only the improved text without any additional explanations or formatting.`;
    
    const requestBody = {
      model: "llama3-8b-8192",
      messages: [
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 2048,
      top_p: 0.95
    };

    console.log('Making request to Groq API...');
    
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify(requestBody)
    });

    console.log('Groq API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Groq API error:', errorText);
      throw new Error(`Groq API request failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    console.log('Groq API response received, choices:', data.choices ? data.choices.length : 0);
    
    if (data.choices && data.choices[0] && data.choices[0].message) {
      const improvedContent = data.choices[0].message.content.trim().replace(/\n/g, '<br>');
      console.log('Improved content length:', improvedContent.length);
      return res.status(200).json({ improvedContent });
    } else {
      console.error('Invalid Groq response format:', data);
      throw new Error('Invalid response format from Groq API');
    }

  } catch (error) {
    console.error('Error in improve-note API:', error);
    return res.status(500).json({ 
      error: 'Failed to improve note. Please try again.',
      details: error.message 
    });
  }
} 