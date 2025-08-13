from fastapi import FastAPI, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
import fitz  # PyMuPDF
import google.generativeai as genai
import uvicorn
import os

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

genai.configure(api_key="AIzaSyBMQ4n_YgKuQDho7FwDS881Esn5NfDo_4c")

def extract_text_from_pdf(pdf_path):
    doc = fitz.open(pdf_path)
    text = ""
    for page in doc:
        text += page.get_text("text") + "\n"
    return text

def generate_summary(text, user_level="Basic"):
    model = genai.GenerativeModel("gemini-1.5-flash")
    summary = ""
    
    # Adjust chunk size and processing based on user level
    if user_level == "Basic":
        chunk_size = 6000  # Smaller chunks for simpler processing
        max_chunks = 3     # Limit chunks for shorter summaries
    elif user_level == "Intermediate":
        chunk_size = 8000  # Medium chunks
        max_chunks = 5     # Moderate length summaries
    else:  # Advanced
        chunk_size = 10000 # Larger chunks for detailed analysis
        max_chunks = 8     # Longer, more comprehensive summaries
    
    num_chunks = min(len(text) // chunk_size + 1, max_chunks)

    for i in range(num_chunks):
        chunk = text[i * chunk_size: (i + 1) * chunk_size]

        # Generate different prompts based on user level
        prompt = get_level_specific_prompt(chunk, user_level, i + 1, num_chunks)

        response = model.generate_content(prompt)
        summary += response.text + "\n\n"

    return summary

def get_level_specific_prompt(chunk, user_level, current_chunk, total_chunks):
    base_continuation = f"This is part {current_chunk} of {total_chunks}. Continue seamlessly from previous parts." if current_chunk > 1 else ""
    
    if user_level == "Basic":
        return f"""
        {base_continuation}
        
        Create a **simple, easy-to-understand summary** of the following text:
        - Use **plain language** and avoid technical jargon
        - Explain concepts in **simple terms** that anyone can understand
        - Keep explanations **concise and clear**
        - Use **analogies and everyday examples** when explaining complex ideas
        - Focus on **main points and key takeaways**
        - Structure with clear headings and bullet points where helpful
        
        Text:
        {chunk}
        """
    
    elif user_level == "Intermediate":
        return f"""
        {base_continuation}
        
        Create a **balanced, moderately detailed explanation** of the following text:
        - Provide **good depth** without overwhelming complexity
        - Include **some technical terms** with brief explanations
        - Use **relevant examples** and practical applications
        - Cover **important details** while maintaining readability
        - Balance between **simplicity and thoroughness**
        - Include **context and background** where relevant
        
        Text:
        {chunk}
        """
    
    else:  # Advanced
        return f"""
        {base_continuation}
        
        Create a **comprehensive, detailed analysis** of the following text:
        - Provide **in-depth technical explanations** and analysis
        - Include **advanced concepts, formulas, and methodologies**
        - Use **professional terminology** and domain-specific language
        - Explore **complex relationships and implications**
        - Include **detailed case studies, examples, and applications**
        - Provide **critical analysis and multiple perspectives**
        - Reference **theoretical frameworks** and research where applicable
        
        Text:
        {chunk}
        """

@app.post("/upload/")
async def upload_pdf(
    file: UploadFile = File(...), 
    user_level: str = Form(default="Basic")
):
    # Validate user level
    valid_levels = ["Basic", "Intermediate", "Advanced"]
    if user_level not in valid_levels:
        user_level = "Basic"  # Default fallback
    
    pdf_path = f"temp_{file.filename}"
    
    try:
        with open(pdf_path, "wb") as f:
            f.write(await file.read())
        
        text = extract_text_from_pdf(pdf_path)
        os.remove(pdf_path)
        
        # Generate level-appropriate summary
        summary = generate_summary(text, user_level)
        
        return {
            "summary": summary,
            "user_level": user_level,
            "message": f"Summary generated for {user_level} level"
        }
    
    except Exception as e:
        # Clean up file if error occurs
        if os.path.exists(pdf_path):
            os.remove(pdf_path)
        return {"error": str(e)}

# Health check endpoint
@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "PDF Summarizer"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)