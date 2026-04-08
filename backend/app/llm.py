import os
import requests
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

# -------------------------------
# CONFIG
# -------------------------------
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
OLLAMA_URL = "http://localhost:11434/api/generate"
OLLAMA_MODEL = "llama3.2:1b"

# Groq client
client = Groq(api_key=GROQ_API_KEY)


# -------------------------------
# 🔥 GROQ CALL (PRIMARY)
# -------------------------------
def call_groq(prompt: str):
    if not client:
        raise Exception("Groq not available")

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}]
    )

    return response.choices[0].message.content


# -------------------------------
# ⚠️ OLLAMA FALLBACK
# -------------------------------
def call_ollama(prompt: str):
    try:
        response = requests.post(
            OLLAMA_URL,
            json={
                "model": OLLAMA_MODEL,
                "prompt": prompt,
                "stream": False
            },
            timeout=120
        )

        response.raise_for_status()
        result = response.json()["response"]

        print("🟡 OLLAMA RESPONSE:", result)

        return result

    except Exception as e:
        print("❌ OLLAMA ERROR:", e)
        raise Exception("Ollama failed")


# -------------------------------
# 🔁 SMART CALL (AUTO SWITCH)
# -------------------------------
def generate_response(prompt: str):
    try:
        return call_groq(prompt)   # ✅ primary
    except:
        print("⚠️ Falling back to Ollama...")
        return call_ollama(prompt)   # ⚠️ fallback


# -------------------------------
# 1️⃣ DOUBT ANSWERING
# -------------------------------
def ask_doubt(question: str):
    prompt = f"""
Explain clearly in simple terms:

{question}
"""
    return generate_response(prompt)


# -------------------------------
# 2️⃣ QUIZ GENERATION
# -------------------------------
import json
import re

def extract_json(text):
    match = re.search(r'\{.*\}', text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group())
        except:
            return {"questions": []}
    return {"questions": []}

def generate_quiz(topic: str, num_questions: int, difficulty: str = "medium"):
    try:
        # -------------------------------
        # DISTRIBUTION LOGIC
        # -------------------------------
        mcq = int(num_questions * 0.5)
        tf = int(num_questions * 0.25)
        fill = num_questions - (mcq + tf)

        # -------------------------------
        # PROMPT (STRICT + CONTROLLED)
        # -------------------------------
        prompt = f"""
Generate a quiz on topic: {topic}
Difficulty: {difficulty}

Total questions: {num_questions}

IMPORTANT RULES:
* Return ONLY valid JSON
* NO extra text
* NO explanations outside JSON

FORMAT:
{{
  "questions": [
    {{
      "type": "mcq",
      "question": "...",
      "options": ["A", "B", "C", "D"],
      "correct_answer": "...",
      "explanation": "..."
    }},
    {{
      "type": "true_false",
      "question": "...",
      "options": ["True", "False"],
      "correct_answer": "True or False",
      "explanation": "..."
    }},
    {{
      "type": "fill_blank",
      "question": "The value of ___ is ...",
      "options": [],
      "correct_answer": "...",
      "explanation": "..."
    }}
  ]
}}

STRICT REQUIREMENTS:
* True/False MUST ALWAYS include options: ["True", "False"]
* MCQ MUST ALWAYS have exactly 4 non-empty options.
* Fill blanks must have an empty options array []
* ALL questions MUST follow the exact same JSON keys (type, question, options, correct_answer, explanation).
* Each question in the 'questions' list MUST be complete.
"""

        # -------------------------------
        # CALL MODEL
        # -------------------------------
        response = generate_response(prompt)

        # -------------------------------
        # -------------------------------
        # PARSE JSON SAFELY
        # -------------------------------
        quiz_data = extract_json(response)

        # -------------------------------
        # VALIDATION (BASIC)
        # -------------------------------
        if not quiz_data or "questions" not in quiz_data or not quiz_data["questions"]:
            return {"questions": []}

        for q in quiz_data["questions"]:
            if q.get("type") == "true_false":
                q["options"] = ["True", "False"]

            if q.get("type") == "mcq":
                # Ensure options is a list and has 4 items
                options = q.get("options")
                if not isinstance(options, list) or len(options) < 4:
                    q["options"] = ["Option A", "Option B", "Option C", "Option D"]
                elif len(options) > 4:
                    q["options"] = options[:4]
            
            # 🛑 FINAL SAFETY: If options is None or empty for non-fill, force it
            if q.get("type") != "fill_blank" and (not q.get("options") or len(q.get("options", [])) == 0):
                if q.get("type") == "true_false":
                    q["options"] = ["True", "False"]
                else:
                    q["options"] = ["Option 1", "Option 2", "Option 3", "Option 4"]

        print("FINAL QUIZ:", quiz_data)
        
        return quiz_data

    except Exception as e:
        print("❌ QUIZ ERROR:", e)

        # -------------------------------
        # FALLBACK (IMPORTANT)
        # -------------------------------
        return {
            "questions": [
                {
                    "type": "mcq",
                    "question": f"Basic question on {topic}",
                    "options": ["Option A", "Option B", "Option C", "Option D"],
                    "correct_answer": "Option A",
                    "explanation": "Fallback question due to error"
                }
            ]
        }


# -------------------------------
# 3️⃣ PERFORMANCE FEEDBACK
# -------------------------------
def generate_feedback(topic: str, correct: int, wrong: int):
    prompt = f"""
A student attempted a quiz.

Topic: {topic}
Correct: {correct}
Wrong: {wrong}

Give:
- Weak areas
- Suggestions
- Study tips
"""
    return generate_response(prompt)


# -------------------------------
# 4️⃣ STUDY PLAN
# -------------------------------
def generate_study_plan(topic: str):
    prompt = f"""
Create a 3-day study plan for: {topic}

Day 1: Basics
Day 2: Practice
Day 3: Advanced
"""
    return generate_response(prompt)