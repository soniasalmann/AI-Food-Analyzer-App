import os
import base64
import json
from flask import Flask, request, jsonify
from flask_cors import CORS
from google import genai
from google.genai import types
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)

# Configure Gemini AI Client (New SDK)
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
client = genai.Client(api_key=GEMINI_API_KEY)

# Prompt for the AI (no annotation)
PROMPT = """
Analyze this food image and provide the nutritional information. the food can also be south asian dishes.
 if there are multiple food items in the image,
 provide the nutritional information for the most prominent one.
 if food cannot be reconized return with unkown to all the fields.
 if picture is food just say example:  "[some funny line about why you cant eat this food]"
Return ONLY a JSON object with the following keys:
"food_name", "calories", "protein", "carbs", "fat"

Example format:
{
  "food_name": "Chicken Salad",
  "calories": 350,
  "protein": 30,
  "carbs": 10,
  "fat": 15
}
"""

# Prompt for annotated images (user drew a green shape around specific food)
ANNOTATED_PROMPT = """
The user has drawn a bright green outline/shape on this food image to highlight a specific food item.
Analyze ONLY the food that is inside or enclosed by the green drawn line. Ignore all other food items outside the green shape.
The food can also be south asian dishes.
If the food inside the green shape cannot be recognized, return with unknown to all fields.
Return ONLY a JSON object with the following keys:
"food_name", "calories", "protein", "carbs", "fat"

Example format:
{
  "food_name": "Chicken Salad",
  "calories": 350,
  "protein": 30,
  "carbs": 10,
  "fat": 15
}
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
        
        # Pick the right prompt based on whether user drew on the image
        selected_prompt = ANNOTATED_PROMPT if has_annotation else PROMPT
        print(f"Sending image to Gemini (annotated={has_annotation}) for analysis...")
        
        response = client.models.generate_content(
            model="gemini-flash-lite-latest",
            contents=[
                selected_prompt,
                types.Part.from_bytes(
                    data=base64.b64decode(image_data),
                    mime_type="image/jpeg"
                )
            ]
        )
        
        # Extract JSON and descriptive text
        raw_text = response.text.strip()
        print(f"Raw AI Response: {raw_text}")
        
        # Try to find JSON block
        import re
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
        print(f"Error during analysis: {str(e)}")
        return jsonify({"error": "Failed to analyze image", "details": str(e)}), 500

if __name__ == '__main__':
    print("AI Backend (Gemini 1.5 Flash) running on http://0.0.0.0:5000")
    app.run(host='0.0.0.0', port=5000, debug=True)
