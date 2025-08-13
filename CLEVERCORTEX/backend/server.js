const express = require("express");
const multer = require("multer");
const pdfParse = require("pdf-parse");
const cors = require("cors");

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// Configure Multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Endpoint to extract text from uploaded PDF
app.post("/extract-text", upload.single("pdf"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No file uploaded" });
        }

        const pdfBuffer = req.file.buffer;
        const data = await pdfParse(pdfBuffer);

        res.json({ text: data.text || "No text found in PDF" });
    } catch (error) {
        console.error("Error extracting text:", error);
        res.status(500).json({ error: "Failed to process the PDF" });
    }
});

app.listen(PORT, () => {
    console.log(`✅ Server is running on http://localhost:${PORT}`);
});
