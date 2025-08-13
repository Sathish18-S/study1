from flask import Flask, request, jsonify
from flask_cors import CORS
import fitz  # PyMuPDF
import google.generativeai as genai
import os
from datetime import datetime, timedelta
import tempfile
import logging
import re
from werkzeug.utils import secure_filename
from typing import Dict, List, Any

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app, resources={
    r"/api/*": {"origins": "*"},
    r"/update_timing": {"origins": "*"}
})

# Configuration - Now adaptive based on user level
def get_config(user_level: str = "Basic") -> Dict[str, Any]:
    """Get configuration based on user level"""
    base_config = {
        "MAX_FILE_SIZE": 10 * 1024 * 1024,  # 10MB
        "BREAK_TIME": 5,
        "DAILY_STUDY_HOURS": 8,
        "SLEEP_DURATION": 7 * 60  # 7 hours
    }
    
    if user_level.lower() == "basic":
        return {
            **base_config,
            "MIN_TOPIC_TIME": 25,  # More time for basic users
            "MAX_TOPIC_TIME": 60,
            "QNA_TIME": 15,  # More Q&A time
            "DIFFICULTY_MULTIPLIER": 1.3,  # 30% more time
            "EXPLANATION_DEPTH": "detailed",
            "QUESTION_COMPLEXITY": "easy"
        }
    elif user_level.lower() == "intermediate":
        return {
            **base_config,
            "MIN_TOPIC_TIME": 20,  # Balanced timing
            "MAX_TOPIC_TIME": 45,
            "QNA_TIME": 10,
            "DIFFICULTY_MULTIPLIER": 1.0,  # Standard time
            "EXPLANATION_DEPTH": "balanced",
            "QUESTION_COMPLEXITY": "medium"
        }
    elif user_level.lower() == "advanced":
        return {
            **base_config,
            "MIN_TOPIC_TIME": 15,  # Less time for advanced users
            "MAX_TOPIC_TIME": 35,
            "QNA_TIME": 8,
            "DIFFICULTY_MULTIPLIER": 0.8,  # 20% less time
            "EXPLANATION_DEPTH": "concise",
            "QUESTION_COMPLEXITY": "hard"
        }
    else:
        # Default to basic if unknown level
        return get_config("Basic")

# Initialize Gemini
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise ValueError("Missing Gemini API key")
genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel('gemini-1.5-flash')

def allowed_file(filename: str) -> bool:
    return '.' in filename and filename.lower().endswith('.pdf')

def extract_text_from_pdf(pdf_path: str) -> str:
    try:
        doc = fitz.open(pdf_path)
        text = "\n".join([page.get_text("text") for page in doc])
        if not text.strip():
            raise ValueError("PDF appears empty or is scanned")
        return text
    except Exception as e:
        logger.error(f"PDF extraction failed: {e}")
        raise

def clean_text(raw_text: str) -> str:
    """Clean and preprocess text before analysis"""
    cleaned = re.sub(r'=====.*=====|Page \d+', '', raw_text)
    return '\n'.join([line.strip() for line in cleaned.split('\n') if line.strip()])

def get_adaptive_prompt(user_level: str, config: Dict[str, Any]) -> str:
    """Generate adaptive prompts based on user level"""
    
    if user_level.lower() == "basic":
        return """
Create a comprehensive study guide for BEGINNER learners. For each topic:

1. Start with: **Topic: [Clear Topic Name]**
2. Provide 4-5 detailed bullet points (start with "- "):
   - Fundamental concept explanation with examples
   - Step-by-step breakdown of key processes
   - Real-world applications and analogies
   - Common misconceptions to avoid
   - Practice tips for better understanding
3. Add 2 EASY MCQs that:
   - Focus on basic definitions and concepts
   - Have clear, straightforward correct answers
   - Test fundamental understanding
   - Avoid complex scenarios or edge cases

Format for questions:
Q: [Simple, direct question about basic concepts]
a) Clearly wrong option
b) Plausible but incorrect basic option
c) Correct answer (straightforward and clear)
d) Obviously incorrect option
Correct: c

Make explanations detailed and beginner-friendly with lots of context.
"""
    
    elif user_level.lower() == "intermediate":
        return """
Create a balanced study guide for INTERMEDIATE learners. For each topic:

1. Start with: **Topic: [Clear Topic Name]**
2. Provide 3-4 focused bullet points (start with "- "):
   - Core concept with practical context
   - Important technical details and relationships
   - Application scenarios and use cases
   - Integration with other concepts
3. Add 2 MEDIUM-level MCQs that:
   - Test understanding of relationships between concepts
   - Include scenario-based questions
   - Have plausible distractors requiring analysis
   - Test both theoretical and practical knowledge

Format for questions:
Q: [Scenario-based or analytical question]
a) Plausible option requiring analysis to reject
b) Correct answer (requires understanding of concepts)
c) Technically sophisticated but incorrect option
d) Reasonable alternative that misses key details
Correct: b

Balance detail with conciseness, assuming some prior knowledge.
"""
    
    else:  # Advanced
        return """
Create a concise study guide for ADVANCED learners. For each topic:

1. Start with: **Topic: [Clear Topic Name]**
2. Provide 3 precise bullet points (start with "- "):
   - Advanced concept with technical precision
   - Complex relationships and edge cases
   - Advanced applications and optimizations
3. Add 2 CHALLENGING MCQs that:
   - Test deep understanding and edge cases
   - Include complex scenarios requiring expert judgment
   - Have sophisticated distractors that seem correct
   - Test ability to apply concepts in novel situations

Format for questions:
Q: [Complex, multi-layered question testing expert knowledge]
a) Sophisticated option that's subtly incorrect
b) Technically sound but incomplete solution
c) Correct answer (requires deep understanding)
d) Advanced-sounding but flawed reasoning
Correct: c

Keep explanations concise but technically precise, assuming strong foundational knowledge.
"""

def parse_response(response_text: str) -> Dict[str, Any]:
    """Parse Gemini response into structured format"""
    result = {
        'topics': [],
        'warnings': [],
        'valid': False
    }
    
    # Split by topic blocks
    topic_blocks = re.split(r'\*\*Topic:\s*(.+?)\*\*', response_text)[1:]
    
    for i in range(0, len(topic_blocks), 2):
        try:
            topic_name = topic_blocks[i].strip()
            content = topic_blocks[i+1] if i+1 < len(topic_blocks) else ""
            
            # Extract bullet points
            summary = re.findall(r'^-\s*(.+)$', content, re.MULTILINE)
            
            # Extract MCQs - more flexible parsing
            mcqs = []
            question_blocks = re.split(r'Q:\s*', content)[1:]  # Split by questions
            
            for q_block in question_blocks[:2]:  # Take first 2 questions only
                if not q_block.strip():
                    continue
                    
                # Split question from options
                q_parts = re.split(r'\n[a-d]\)', q_block, maxsplit=1)
                if len(q_parts) < 2:
                    continue
                    
                question = q_parts[0].strip()
                options_text = 'a)' + q_parts[1]  # Reconstruct options text
                
                # Extract all options
                options = []
                for opt_match in re.finditer(r'^([a-d])\)\s*(.+?)(?=\n[a-d]\)|$)', 
                                           options_text, 
                                           re.MULTILINE | re.DOTALL):
                    options.append(opt_match.group(2).strip())
                
                # Find correct answer
                correct = None
                if len(options) == 4:
                    # Look for explicit correct marker
                    correct_match = re.search(r'Correct:\s*([a-d])', options_text, re.IGNORECASE)
                    if correct_match:
                        correct = correct_match.group(1).lower()
                    else:
                        # Default to different options for different questions
                        question_hash = hash(question) % 4
                        correct = ['a', 'b', 'c', 'd'][question_hash]
                        
                    mcqs.append({
                        'question': question,
                        'options': options,
                        'correct': correct
                    })
            
            if summary and topic_name and not re.match(r'^Topic\s*\d+$', topic_name, re.IGNORECASE):
                result['topics'].append({
                    'topic': topic_name,
                    'summary': summary,
                    'mcqs': mcqs
                })
            else:
                result['warnings'].append(f"Skipped invalid or empty topic: {topic_name}")
                
        except Exception as e:
            result['warnings'].append(f"Error parsing topic: {str(e)}")
    
    result['valid'] = len(result['topics']) > 0
    return result

def generate_content(text: str, user_level: str = "Basic") -> Dict[str, Any]:
    """Generate study content using adaptive prompts based on user level"""
    cleaned_text = clean_text(text[:20000])  # Limit to first 20k chars
    config = get_config(user_level)
    
    if not cleaned_text or len(cleaned_text) < 100:
        return {'error': "No valid content found", 'status': 400}

    # Get adaptive prompt based on user level
    adaptive_prompt = get_adaptive_prompt(user_level, config)
    
    prompt = f"""
{adaptive_prompt}

Content to analyze:
{cleaned_text}
"""
    
    try:
        logger.info(f"Generating content for {user_level} level user")
        response = model.generate_content(prompt)
        parsed = parse_response(response.text)
        
        if not parsed['valid']:
            return {
                'error': "Failed to extract valid topics",
                'warnings': parsed['warnings'],
                'status': 400
            }
        
        # Quality filtering
        processed_topics = []
        for t in parsed['topics']:
            # Ensure we have valid questions
            valid_qna = []
            for q in t.get('mcqs', []):
                # Skip definitional questions for advanced users
                if user_level.lower() == "advanced" and q['question'].lower().startswith(('what is', 'define', 'the definition')):
                    continue
                valid_qna.append(q)
            
            # Adjust minimum requirements based on level
            min_summary_points = 3 if user_level.lower() == "advanced" else 2
            min_questions = 1
            
            if len(t['summary']) >= min_summary_points and len(valid_qna) >= min_questions:
                t['mcqs'] = valid_qna[:2]  # Take up to 2 best questions
                processed_topics.append(t)
        
        if not processed_topics:
            return {
                'error': "No topics meeting quality standards",
                'status': 400
            }
        
        logger.info(f"Generated {len(processed_topics)} topics for {user_level} level")
        return {
            'topics': processed_topics,
            'warnings': parsed['warnings'],
            'status': 200,
            'user_level': user_level
        }

    except Exception as e:
        logger.error(f"Generation error: {str(e)}")
        return {
            'error': f"Content generation failed: {str(e)}",
            'status': 500
        }

def calculate_adaptive_time(topic_name: str, user_level: str = "Basic") -> int:
    """Calculate suggested study time based on user level"""
    config = get_config(user_level)
    
    # Base calculation
    words = len(topic_name.split())
    base_time = words * 5
    
    # Apply level-specific multiplier
    adjusted_time = int(base_time * config["DIFFICULTY_MULTIPLIER"])
    
    # Ensure within bounds
    return min(max(config["MIN_TOPIC_TIME"], adjusted_time), config["MAX_TOPIC_TIME"])

class AdaptiveStudyScheduler:
    def __init__(self, start_time: datetime, user_level: str = "Basic"):
        self.schedule = []
        self.current_time = start_time
        self.topic_counter = 1
        self.user_level = user_level
        self.config = get_config(user_level)
    
    def add_topic(self, topic: Dict[str, Any]) -> None:
        """Add topic with adaptive timing based on user level"""
        # Main study session with adaptive timing
        study_end = self.current_time + timedelta(minutes=topic['suggested_time'])
        qna_end = study_end + timedelta(minutes=self.config["QNA_TIME"])
        
        # Combine into single topic entry
        self.schedule.append({
            'topic_id': self.topic_counter,
            'topic': f"**{topic['name']}**",
            'summary': topic['summary'],
            'start_time': self.current_time.strftime("%I:%M %p"),
            'end_time': qna_end.strftime("%I:%M %p"),
            'allocated_time': topic['suggested_time'] + self.config["QNA_TIME"],
            'completed': False,
            'qna': topic['qna'],
            'user_level': self.user_level,
            'sessions': [
                {
                    'type': 'study',
                    'start_time': self.current_time.strftime("%I:%M %p"),
                    'end_time': study_end.strftime("%I:%M %p"),
                    'duration': topic['suggested_time']
                },
                {
                    'type': 'qna',
                    'start_time': study_end.strftime("%I:%M %p"),
                    'end_time': qna_end.strftime("%I:%M %p"),
                    'duration': self.config["QNA_TIME"]
                }
            ]
        })
        self.current_time = qna_end
        self.topic_counter += 1
        
        # Add adaptive breaks - more frequent for basic users
        break_frequency = 2 if self.user_level.lower() == "basic" else 3
        if len(self.schedule) % break_frequency == 0:
            break_end = self.current_time + timedelta(minutes=self.config["BREAK_TIME"])
            self.schedule.append({
                'type': 'break',
                'start_time': self.current_time.strftime("%I:%M %p"),
                'end_time': break_end.strftime("%I:%M %p"),
                'duration': self.config["BREAK_TIME"]
            })
            self.current_time = break_end

@app.route("/api/process", methods=["POST"])
def process():
    try:
        if 'pdf' not in request.files:
            return jsonify({"error": "No file uploaded"}), 400
        
        file = request.files['pdf']
        if not file or not allowed_file(file.filename):
            return jsonify({"error": "Invalid file"}), 400

        # Get user level from form data (sent from frontend)
        user_level = request.form.get('userLevel', 'Basic')
        logger.info(f"Processing request for user level: {user_level}")

        with tempfile.NamedTemporaryFile(delete=False) as tmp:
            file.save(tmp.name)
            try:
                text = extract_text_from_pdf(tmp.name)
                content = generate_content(text, user_level)
                
                if content['status'] != 200:
                    return jsonify(content), content['status']
                
                # Prepare topics with adaptive timing
                topics = []
                for idx, topic in enumerate(content['topics'][:15], 1):
                    # Standardize the correct answer format
                    qna = []
                    for q in topic.get('mcqs', []):
                        correct = q['correct'][0].lower() if q['correct'] else 'a'
                        if correct not in ['a', 'b', 'c', 'd']:
                            correct = 'a'
                            
                        qna.append({
                            'question': q['question'],
                            'options': q['options'],
                            'correct': correct
                        })
                    
                    topics.append({
                        'id': idx,
                        'name': topic['topic'],
                        'summary': "\n".join(topic['summary']),
                        'qna': qna,
                        'suggested_time': calculate_adaptive_time(topic['topic'], user_level)
                    })
                
                # Generate adaptive schedule
                scheduler = AdaptiveStudyScheduler(datetime.now(), user_level)
                for topic in topics:
                    scheduler.add_topic(topic)
                
                # Filter out break items for frontend
                final_schedule = [item for item in scheduler.schedule if item.get('topic_id')]
                
                logger.info(f"Generated {len(final_schedule)} topics for {user_level} level")
                
                return jsonify({
                    "status": "success",
                    "schedule": final_schedule,
                    "metadata": {
                        "total_topics": len(topics),
                        "total_time": sum(
                            t['allocated_time'] 
                            for t in final_schedule
                        ),
                        "user_level": user_level,
                        "adaptive_features": {
                            "time_per_topic": f"{get_config(user_level)['MIN_TOPIC_TIME']}-{get_config(user_level)['MAX_TOPIC_TIME']} min",
                            "qna_time": f"{get_config(user_level)['QNA_TIME']} min",
                            "explanation_style": get_config(user_level)['EXPLANATION_DEPTH'],
                            "question_difficulty": get_config(user_level)['QUESTION_COMPLEXITY']
                        },
                        "warnings": content.get('warnings', [])
                    }
                })
                
            except Exception as e:
                logger.error(f"Processing error: {e}")
                return jsonify({"error": str(e)}), 500
            finally:
                try:
                    os.unlink(tmp.name)
                except:
                    pass
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        return jsonify({"error": "Internal server error"}), 500

@app.route("/api/update_timing", methods=["POST"])
def update_timing():
    try:
        data = request.get_json()
        if not data or 'topic_id' not in data or 'minutes' not in data:
            return jsonify({"error": "Missing required data"}), 400

        try:
            topic_id = int(data['topic_id'])
            minutes = int(data['minutes'])
            if minutes <= 0:
                return jsonify({"error": "Time must be positive"}), 400
        except ValueError:
            return jsonify({"error": "Invalid numeric values"}), 400

        return jsonify({
            "status": "success",
            "message": "Time updated successfully",
            "topic_id": topic_id,
            "new_time": minutes,
            "time_saved": data.get('allocated_time', 0) - minutes
        })

    except Exception as e:
        logger.error(f"Update timing error: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500

if __name__ == "__main__":
    if os.name == 'nt':
        tempfile.tempdir = os.path.expanduser("~\\temp")
        os.makedirs(tempfile.tempdir, exist_ok=True)
    
    app.run(host="0.0.0.0", port=5000, debug=True)