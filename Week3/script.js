import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Enable parsing of JSON bodies
app.use(express.json());

// Serve static frontend files (index.html, style.css, etc.)
app.use(express.static(__dirname));

// Verify that the API Key is loaded
if (!process.env.API_KEY) {
  console.warn('WARNING: API_KEY is not defined in your environment variables or .env file!');
}

// Initialize the Google Gen AI SDK
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Endpoint to generate a structured task plan for a given goal
 */
app.post('/api/plan', async (req, res) => {
  const { goal, model } = req.body;

  if (!goal || typeof goal !== 'string' || goal.trim() === '') {
    return res.status(400).json({ error: 'A valid goal string is required.' });
  }

  // Use the requested model or default to gemini-2.5-flash
  const modelToUse = model || 'gemini-2.5-flash';
  console.log(`Received request for goal: "${goal.trim()}" using model: "${modelToUse}"`);

  try {
    const response = await ai.models.generateContent({
      model: modelToUse,
      contents: `Create a detailed, step-by-step task list to achieve this goal: "${goal.trim()}". The plan should be realistic, structured sequentially, and include appropriate task names, priority levels, and estimated time to complete.`,
      config: {
        // Enforce JSON output format
        responseMimeType: 'application/json',
        // Define the exact JSON structure Gemini must return
        responseSchema: {
          type: 'OBJECT',
          properties: {
            tasks: {
              type: 'ARRAY',
              items: {
                type: 'OBJECT',
                properties: {
                  task_name: { type: 'STRING' },
                  priority: { 
                    type: 'STRING',
                    description: 'The priority of the task: must be either High, Medium, or Low'
                  },
                  estimated_time: { 
                    type: 'STRING',
                    description: 'The estimated duration (e.g., 2 hours, 1 day, 30 minutes)'
                  }
                },
                required: ['task_name', 'priority', 'estimated_time']
              }
            }
          },
          required: ['tasks']
        }
      }
    });

    // Check if we received text output
    if (!response.text) {
      throw new Error('Gemini API returned an empty response.');
    }

    // Parse the structured JSON response and send it back to the client
    const data = JSON.parse(response.text);
    
    if (!data.tasks || !Array.isArray(data.tasks)) {
      throw new Error('Response did not match the expected task list schema.');
    }

    res.json(data);
  } catch (error) {
    console.error('Gemini Generation Error:', error);
    res.status(500).json({
      error: error.message || 'An unexpected error occurred while communicating with the Gemini AI.'
    });
  }
});

// Fallback index.html route for client routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Start the server
app.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(`🚀 Smart Task Planner server running on port ${PORT}`);
  console.log(`🌐 Open http://localhost:${PORT} in your browser`);
  console.log(`==================================================`);
});
