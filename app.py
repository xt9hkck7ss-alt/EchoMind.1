from dotenv import load_dotenv
load_dotenv()

from flask import Flask, render_template, request, jsonify
import requests
import os
import logging 
import json # Moved import json to the top

app = Flask(__name__)

app.logger.setLevel(logging.INFO)

@app.route('/')
def quiz():
    return render_template('index.html')

@app.route('/generate_questions', methods=['GET'])
def generate_questions():
    category = request.args.get('category', 'general')
    difficulty = request.args.get('difficulty', 'easy')

    prompt = f"Generate 5 multiple-choice quiz questions about {category} with {difficulty} difficulty. Each question should have 3 options and one correct answer. The output should be a JSON array of objects, where each object has 'question', 'options' (array of strings), and 'answer' (the correct option as a string) key."

    url = "https://api.asi1.ai/v1/chat/completions"
    headers = {
        "Content-Type": "application/json",
        "Authorization": "Bearer sk_50563df4573b4f9089675a644592b1aa76f5d5821c7d49e9884793f46c4baca2"
    }
    data = {
        "model": "asi1-mini",
        "messages": [{"role": "user", "content": prompt}],
        "response_format": {"type": "json_object"}
    }
    
    raw_content = "{}" # Initialize raw_content for error reporting
    try:
        response = requests.post(url, headers=headers, json=data, timeout=30)
        response.raise_for_status() # Raise an exception for HTTP errors
        raw_content = response.json().get("choices", [{}])[0].get("message", {}).get("content", "{}")
        app.logger.info(f"Raw content from ASI:One: {raw_content}") # Log the raw content

        # Attempt to clean up the raw_content if it's wrapped in markdown or extra text
        # This is a common pattern for LLMs that return JSON within a text response
        if raw_content.strip().startswith('```json') and raw_content.strip().endswith('```'):
            json_string = raw_content.strip()[len('```json'):-len('```')].strip() # Remove triple backticks and 'json'
        else:
            json_string = raw_content.strip()

        questions_data = json.loads(json_string)
        return jsonify(questions_data)
    except requests.exceptions.RequestException as e:
        app.logger.error(f"Error fetching questions from ASI:One API: {e}")
        return jsonify({"error": "Failed to generate questions from AI"}), 500
    except json.JSONDecodeError as e:
        app.logger.error(f"Error decoding JSON from ASI:One API: {e}. Raw content: {raw_content}")
        return jsonify({"error": "Invalid JSON response from AI"}), 500

@app.route('/get_hint', methods=['POST'])
def get_hint():
    data = request.get_json()
    question = data.get('question')
    options = data.get('options')
    
    prompt = f"Provide a concise hint for the following quiz question: {question} Options: {", ".join(options)}. The hint should not reveal the answer directly."
    
    url = "https://api.asi1.ai/v1/chat/completions"
    headers = {
        "Content-Type": "application/json",
        "Authorization": "Bearer sk_50563df4573b4f9089675a644592b1aa76f5d5821c7d49e9884793f46c4baca2"
    }
    data = {
        "model": "asi1-mini",
        "messages": [{"role": "user", "content": prompt}]
    }

    try:
        response = requests.post(url, headers=headers, json=data, timeout=30)
        response.raise_for_status()
        hint_content = response.json().get("choices", [{}])[0].get("message", {}).get("content", "No hint available.")
        return jsonify({"hint": hint_content})
    except requests.exceptions.RequestException as e:
        app.logger.error(f"Error fetching hint from ASI:One API: {e}")
        return jsonify({"error": "Failed to get hint from AI"}), 500

if __name__ == '__main__':
    app.run(debug=True)
