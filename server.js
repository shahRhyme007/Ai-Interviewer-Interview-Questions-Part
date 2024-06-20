const express = require('express');
const fileUpload = require('express-fileupload');
const pdfParse = require('pdf-parse');
require('dotenv').config();
const OpenAI = require('openai');

const app = express();
const port = process.env.PORT || 3000;

const openaiApiKey = process.env.OPENAI_API_KEY || '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';

const openai = new OpenAI({
    apiKey: openaiApiKey,
});

app.use(express.json());
app.use(fileUpload());
app.use(express.static('public'));

app.post('/upload', async (req, res) => {
    if (!req.files || !req.files.pdf) {
        return res.status(400).send('No file uploaded.');
    }

    const pdf = req.files.pdf;
    const pdfData = await pdfParse(pdf.data);

    const text = pdfData.text;
    const chunkSize = 1000;
    const overlap = 200;
    const chunks = [];
    for (let i = 0; i < text.length; i += chunkSize - overlap) {
        chunks.push(text.slice(i, i + chunkSize));
    }

    res.json({ text, chunks });
});

async function generateQuestions(text) {
    const prompt = `Generate 10 interview questions based on the following resume. Respond in JSON format with a list of questions. For example: {"questions": ["What is your greatest strength?", "Describe a challenge you overcame.", ..., "Why should we hire you?"]}\n\nResume text:\n\n${text}`;

    for (let attempt = 1; attempt <= 3; attempt++) {
        try {
            const response = await openai.chat.completions.create({
                model: "gpt-4",
                messages: [{ role: "user", content: prompt }],
                max_tokens: 300, // Increased max_tokens
            });

            const message = response.choices[0].message.content;

            const start = message.indexOf('{');
            const end = message.lastIndexOf('}') + 1;

            if (start === -1 || end === -1 || (end - start) < 50) { // Adjusted length check
                throw new Error('Valid JSON boundaries not found or JSON too short in the response');
            }

            const jsonStr = message.slice(start, end);

            const parsedJson = JSON.parse(jsonStr);
            if (!parsedJson.questions || parsedJson.questions.length < 10) {
                throw new Error('Incomplete question list');
            }

            return parsedJson;
        } catch (error) {
            console.error(`Attempt ${attempt}: Failed to parse JSON or fetch response -`, error.message);
            if (error.response) {
                console.error('OpenAI Response:', error.response.data);
            }

            if (attempt === 3) {
                throw new Error('Failed to generate questions after 3 attempts.');
            }
        }
    }
}

app.post('/generate-questions', async (req, res) => {
    const { text } = req.body;

    try {
        const questionsJson = await generateQuestions(text);
        res.json(questionsJson);
    } catch (error) {
        console.error('Final Error:', error.message);
        res.status(500).send('Failed to generate questions.');
    }
});

app.post('/ask-question', async (req, res) => {
    const { text, query } = req.body;
    const prompt = `Answer the following question based on this text:\n\n${text}\n\nQuestion: ${query}`;

    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [{ role: "user", content: prompt }],
            max_tokens: 150,
        });

        res.json({ answer: response.choices[0].message.content.trim() });
    } catch (error) {
        console.error('Error from OpenAI API:', error.message);
        res.status(500).send('Failed to answer question.');
    }
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
