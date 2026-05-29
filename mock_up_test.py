from flask import Flask, request, jsonify
from flask_cors import CORS
import time

app = Flask(__name__)
CORS(app) 

@app.route('/analyze', methods=['POST'])
def analyze():
    
    print("Received image data for analysis...")
    time.sleep(2) 
    

    data = request.json
    if not data or 'image_data' not in data:
        return jsonify({"error": "No image data provided"}), 400


    mock_response = {
        "food_name": "Mocked Avocado Toast",
        "calories": 280,
        "protein": 8,
        "carbs": 24,
        "fat": 18
    }
    
    print("Sending mock response:", mock_response)
    return jsonify(mock_response)

if __name__ == '__main__':
    # Listen on all interfaces (0.0.0.0) so physical devices on the same WiFi can connect
    print("Mock Backend running on http://0.0.0.0:5000")
    app.run(host='0.0.0.0', port=5000, debug=True)
