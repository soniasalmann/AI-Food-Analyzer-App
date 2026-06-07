import os
import base64
import json
import re
import gc
import traceback
from flask import Flask, request, jsonify
from flask_cors import CORS
from google import genai
from google.genai import types
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)

# Increase max content length to 50MB for large images
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024

# Configure Gemini AI Client (New SDK)
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
client = genai.Client(api_key=GEMINI_API_KEY)

# Prompt for the AI (no annotation)
PROMPT = """
Analyze this food image and provide a professional nutritional assessment. 
The food can also be South Asian dishes.
If there are multiple food items, analyze the most prominent one.

Provide the following in a JSON object:
1. "food_name": Name of the dish.
2. "calories": Total kcal.
3. "protein": Grams.
4. "carbs": Grams.
5. "fat": Grams.
6. "health_score": A numerical score from 0-100 based on nutritional density.
7. "health_grade": A letter grade (A+, A, B, C, D, or F).
8. "warnings": A list of short dietary warnings.
9. "insight": A one-sentence professional nutrition tip.
10. "ingredients": A list of predicted main ingredients.
11. "healthy_recipe": A JSON object with:
    - "improvements": A short list of how to make THIS dish healthier.
    - "steps": A 3-5 step simplified healthy recipe for this dish.

Return ONLY the JSON object.
"""

# Prompt for annotated images
ANNOTATED_PROMPT = """
The user has highlighted a specific food item with a green outline. Analyze ONLY the food inside that shape.
The food can also be South Asian dishes.

Provide the following in a JSON object:
1. "food_name": Name of the dish.
2. "calories": Total kcal.
3. "protein": Grams.
4. "carbs": Grams.
5. "fat": Grams.
6. "health_score": A numerical score from 0-100 based on nutritional density.
7. "health_grade": A letter grade (A+, A, B, C, D, or F).
8. "warnings": A list of short dietary warnings.
9. "insight": A one-sentence professional nutrition tip.
10. "ingredients": A list of predicted main ingredients.
11. "healthy_recipe": A JSON object with:
    - "improvements": A short list of how to make THIS dish healthier.
    - "steps": A 3-5 step simplified healthy recipe for this dish.

Return ONLY the JSON object.
"""

# Prompt for Menu X-Ray
MENU_PROMPT = """
Analyze this restaurant menu image. Identify the main dishes and categorize them into a "Traffic Light" health system.
The menu might contain South Asian or international dishes.

Provide the results in a JSON array of objects, where each object has:
1. "item_name": Name of the dish.
2. "category": "Green" (Healthy/Nutritious), "Yellow" (Moderate/Occasional), or "Red" (Unhealthy/Treat).
3. "reason": A short explanation of why it fits this category.
4. "estimated_calories": A rough estimate (e.g., "300-400").
5. "health_tip": A short tip (e.g., "Ask for less oil", "Great protein source").

Focus on the 5-8 most prominent items on the menu.
Return ONLY the JSON array.
"""

@app.route('/analyze', methods=['POST'])
def analyze():
    try:
        data = request.json
        if not data or 'image_data' not in data:
            return jsonify({"error": "No image data provided"}), 400

        # Create Content part for the new SDK
        image_data = data['image_data']
        has_annotation = data.get('has_annotation', False)

        # Strip data URI prefix if present (e.g. "data:image/jpeg;base64,...")
        if image_data.startswith('data:'):
            image_data = image_data.split(',', 1)[1]
        
        # Log image size for debugging
        image_size_kb = len(image_data) * 3 / 4 / 1024
        print(f"Image size: ~{image_size_kb:.0f} KB, annotated={has_annotation}")

        # Decode the base64 image
        image_bytes = base64.b64decode(image_data)
        
        # Free the large base64 string from memory immediately
        del image_data
        del data
        gc.collect()

        # Pick the right prompt based on whether user drew on the image
        selected_prompt = ANNOTATED_PROMPT if has_annotation else PROMPT
        print(f"Sending image to Gemini for analysis...")
        
        response = client.models.generate_content(
            model="gemini-flash-lite-latest",
            contents=[
                selected_prompt,
                types.Part.from_bytes(
                    data=image_bytes,
                    mime_type="image/jpeg"
                )
            ],
            config=types.GenerateContentConfig(
                temperature=0,  # Deterministic: same image = same result every time
            )
        )
        
        # Free image bytes from memory
        del image_bytes
        gc.collect()

        # Extract JSON and descriptive text
        raw_text = response.text.strip()
        print(f"Raw AI Response: {raw_text}")
        
        # Try to find JSON block
        json_match = re.search(r'\{.*\}', raw_text, re.DOTALL)
        
        description = ""
        if json_match:
            json_text = json_match.group()
            # The description is everything outside the JSON
            description = raw_text.replace(json_text, "").strip()
            # Clean up markdown if it was there
            description = re.sub(r'```json|```', '', description).strip()
            nutrition_data = json.loads(json_text)
        else:
            nutrition_data = {
                "food_name": "unknown",
                "calories": 0,
                "protein": 0,
                "carbs": 0,
                "fat": 0
            }
            description = raw_text

        # Include the description in the final response
        nutrition_data["description"] = description
        print(f"Analysis complete: {nutrition_data['food_name']}")
        
        return jsonify(nutrition_data)

    except Exception as e:
        # Print full traceback so we can see exactly what crashed
        print(f"========== ERROR ==========")
        traceback.print_exc()
        print(f"===========================")
        gc.collect()
        return jsonify({"error": "Failed to analyze image", "details": str(e)}), 500

# Health check endpoint to test if server is alive
@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "ok"})

@app.route('/recommendations', methods=['POST'])
def recommendations():
    try:
        data = request.json
        daily_totals = data.get('daily_totals', {"calories": 0, "protein": 0, "carbs": 0, "fat": 0})
        
        prompt = f"""
        Based on these daily nutritional totals: {daily_totals}.
        Suggest 3 healthy South Asian (Indian, Pakistani, Bengali, etc.) dishes that would balance this diet.
        
        IMPORTANT: Whenever appropriate for the nutritional balance, prefer suggesting these specific dishes: 
        "Dal Tadka", "Palak Paneer", or "Tandoori Chicken".
        
        Return ONLY a JSON array of 3 objects with these keys:
        "name", "reason" (why this helps), "calories", "protein", "carbs", "fat", "image_query" (a simple 2-word English name for the dish for image searching).

        Example:
        [
          {{"name": "Chana Masala", "reason": "High in plant-based protein and fiber.", "calories": 250, "protein": 12, "carbs": 35, "fat": 8, "image_query": "chana masala"}}
        ]
        """
        
        response = client.models.generate_content(
            model="gemini-flash-lite-latest",
            contents=[prompt]
        )
        
        raw_text = response.text.strip()
        json_match = re.search(r'\[.*\]', raw_text, re.DOTALL)
        
        if json_match:
            suggestions = json.loads(json_match.group())
            return jsonify(suggestions)
        else:
            return jsonify([])

    except Exception as e:
        print(f"Error in recommendations: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/analyze_menu', methods=['POST'])
def analyze_menu():
    try:
        data = request.json
        if not data or 'image_data' not in data:
            return jsonify({"error": "No image data provided"}), 400

        image_data = data['image_data']
        if image_data.startswith('data:'):
            image_data = image_data.split(',', 1)[1]
        
        image_bytes = base64.b64decode(image_data)
        
        print(f"Sending menu image to Gemini for analysis...")
        
        response = client.models.generate_content(
            model="gemini-flash-lite-latest",
            contents=[
                MENU_PROMPT,
                types.Part.from_bytes(
                    data=image_bytes,
                    mime_type="image/jpeg"
                )
            ],
            config=types.GenerateContentConfig(temperature=0)
        )
        
        raw_text = response.text.strip()
        json_match = re.search(r'\[.*\]', raw_text, re.DOTALL)
        
        if json_match:
            menu_data = json.loads(json_match.group())
            return jsonify(menu_data)
        else:
            return jsonify([])

    except Exception as e:
        print(f"Error in menu analysis: {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    print("AI Backend (Gemini 1.5 Flash) running on http://0.0.0.0:5000")
    app.run(host='0.0.0.0', port=5000, debug=False, threaded=True)
