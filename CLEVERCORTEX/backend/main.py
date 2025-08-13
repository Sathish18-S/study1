from fastapi import FastAPI, File, UploadFile, Form, HTTPException, WebSocket
from fastapi.middleware.cors import CORSMiddleware
import fitz  # PyMuPDF
import google.generativeai as genai
import uvicorn
import json
import os
from typing import Optional

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure GenAI
genai.configure(api_key="AIzaSyBMQ4n_YgKuQDho7FwDS881Esn5NfDo_4c")

@app.get("/")
async def root():
    return {
        "message": "Welcome to the MCQ Generator API",
        "endpoints": {
            "generate_from_text": "POST /qui/text",
            "generate_from_pdf": "POST /qui/pdf",
        }
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    await websocket.send_json({"message": "Connected to WebSocket"})
    # Add your WebSocket logic here

def extract_text_from_pdf(pdf_path: str) -> str:
    """Extract text from PDF file"""
    try:
        doc = fitz.open(pdf_path)
        text = ""
        for page in doc:
            text += page.get_text("text") + "\n"
        return text
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error reading PDF: {str(e)}")

def get_difficulty_prompt(level: str) -> str:
    """Get difficulty-specific prompt instructions"""
    difficulty_prompts = {
        "Basic": """
        Generate BASIC level questions that:
        - Test fundamental concepts and definitions
        - Use simple, clear language
        - Focus on recall and basic understanding
        - Avoid complex analysis or synthesis
        - Include straightforward factual questions
        """,
        "Intermediate": """
        Generate INTERMEDIATE level questions that:
        - Test application of concepts
        - Require some analysis and connections between ideas
        - Use moderate complexity in language and scenarios
        - Include some problem-solving elements
        - Mix factual recall with conceptual understanding
        """,
        "Advanced": """
        Generate ADVANCED level questions that:
        - Test deep understanding and critical thinking
        - Require analysis, synthesis, and evaluation
        - Use complex scenarios and applications
        - Include challenging problem-solving situations
        - Focus on higher-order thinking skills
        - May require connecting multiple concepts
        """
    }
    return difficulty_prompts.get(level, difficulty_prompts["Basic"])

def generate_mcqs(text: str, num_questions: int = 20, user_level: str = "Basic") -> list:
    """Generate MCQs using GenAI with difficulty adjustment"""
    try:
        difficulty_instruction = get_difficulty_prompt(user_level)
        
        prompt = f"""
        {difficulty_instruction}
        
        Generate {num_questions} multiple-choice questions based on the following text.
        Each question should have four options and one correct answer.
        
        DIFFICULTY LEVEL: {user_level}
        
        For {user_level} level:
        - Questions should be appropriate for someone at {user_level} knowledge level
        - Adjust complexity, vocabulary, and cognitive demands accordingly
        
        Format the response as a PROPER JSON array with 'question', 'options', and 'answer'.
        
        Example format:
        {{
            "questions": [
                {{
                    "question": "What is the capital of France?",
                    "options": ["London", "Paris", "Berlin", "Madrid"],
                    "answer": "Paris"
                }}
            ]
        }}
        
        Text:
        {text[:2000]}
        """
        
        model = genai.GenerativeModel("gemini-1.5-flash")
        response = model.generate_content(prompt)

        cleaned_text = response.text.strip()
        if cleaned_text.startswith("```json"):
            cleaned_text = cleaned_text[7:-3].strip()
        
        result = json.loads(cleaned_text)
        return result.get("questions", [])
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating questions: {str(e)}")

@app.post("/qui/text")
async def generate_from_text(
    text: str = Form(...),
    num_questions: int = Form(15),
    user_level: str = Form("Basic")  # New parameter for user level
):
    """Generate MCQs from text input with adaptive difficulty"""
    try:
        if not text.strip():
            raise HTTPException(status_code=422, detail="Text cannot be empty")
        
        if num_questions < 1 or num_questions > 20:
            raise HTTPException(status_code=422, detail="Number of questions must be between 1-20")
        
        # Validate user level
        valid_levels = ["Basic", "Intermediate", "Advanced"]
        if user_level not in valid_levels:
            user_level = "Basic"  # Default fallback
        
        questions = generate_mcqs(text, num_questions, user_level)
        return {
            "questions": questions,
            "difficulty_level": user_level,
            "total_questions": len(questions)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/qui/pdf")
async def generate_from_pdf(
    file: UploadFile = File(...),
    num_questions: int = Form(20),
    user_level: str = Form("Basic")  # New parameter for user level
):
    """Generate MCQs from PDF file with adaptive difficulty"""
    try:
        # Validate file type
        if not file.filename.lower().endswith('.pdf'):
            raise HTTPException(status_code=422, detail="Only PDF files are supported")
        
        # Validate number of questions
        if num_questions < 1 or num_questions > 20:
            raise HTTPException(status_code=422, detail="Number of questions must be between 1-20")
        
        # Validate user level
        valid_levels = ["Basic", "Intermediate", "Advanced"]
        if user_level not in valid_levels:
            user_level = "Basic"  # Default fallback
        
        # Save temporary file
        temp_path = f"temp_{file.filename}"
        with open(temp_path, "wb") as f:
            f.write(await file.read())
        
        # Process PDF
        text = extract_text_from_pdf(temp_path)
        os.remove(temp_path)  # Clean up
        
        questions = generate_mcqs(text, num_questions, user_level)
        return {
            "questions": questions,
            "difficulty_level": user_level,
            "total_questions": len(questions)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        if 'temp_path' in locals() and os.path.exists(temp_path):
            os.remove(temp_path)
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8081)