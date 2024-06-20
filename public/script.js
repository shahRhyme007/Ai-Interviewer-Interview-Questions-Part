async function uploadPDF() {
    const pdfUpload = document.getElementById('pdf-upload').files[0];
    if (!pdfUpload) {
        alert('Please upload a PDF file.');
        return;
    }

    const formData = new FormData();
    formData.append('pdf', pdfUpload);

    const response = await fetch('/upload', {
        method: 'POST',
        body: formData,
    });

    const data = await response.json();
    document.getElementById('pdf-name').innerText = `Uploaded: ${pdfUpload.name}`;
    window.pdfText = data.text;
}

async function generateQuestions() {
    if (!window.pdfText) {
        alert('Please upload a PDF file first.');
        return;
    }

    try {
        const response = await fetch('/generate-questions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: window.pdfText }),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const questionsDiv = document.getElementById('questions');
        questionsDiv.innerHTML = '<h3>Interview Questions:</h3><pre>' + JSON.stringify(data, null, 2) + '</pre>';
    } catch (error) {
        console.error('Failed to fetch generate-questions:', error);
        alert('Failed to generate questions. Please try again later.');
    }
}

async function askQuestion() {
    const query = document.getElementById('query').value;
    if (!window.pdfText || !query) {
        alert('Please upload a PDF file and enter a query.');
        return;
    }

    try {
        const response = await fetch('/ask-question', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: window.pdfText, query }),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        document.getElementById('answer').innerText = `Answer: ${data.answer}`;
    } catch (error) {
        console.error('Failed to fetch ask-question:', error);
        alert('Failed to answer question. Please try again later.');
    }
}
