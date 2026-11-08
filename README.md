# 🍏 MadiFood — AI-Powered Nutrition & Diet Assistant

[![React Native](https://img.shields.io/badge/React_Native-Expo_SDK_54-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactnative.dev/)
[![Python](https://img.shields.io/badge/Python-Flask_Backend-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://flask.palletsprojects.com/)
[![Google Gemini](https://img.shields.io/badge/AI-Google_Gemini_1.5_Flash-8E75B2?style=for-the-badge&logo=google&logoColor=white)](https://aistudio.google.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge)](LICENSE)

An intelligent, full-stack mobile application that replaces tedious manual calorie logging with instant, multimodal AI visual analysis. Designed especially to bridge the gap for **South Asian and complex multicultural cuisines**, where dishes are unpackaged, richly spiced, and served as mixed meals.

---

## 📌 Problem & Motivation

Most popular calorie-tracking applications (like MyFitnessPal or Lose It!) are built around Western packaged foods and standardized single-ingredient meals. When it comes to traditional South Asian dishes (like Biryani, Nihari, Karahi, or Daal):
- **Missing or Inaccurate Data:** Databases lack accurate nutritional modeling for regional cooking styles, oil/ghee variations, and mixed ingredients.
- **Tedious Manual Logging:** Breaking down home-cooked meals ingredient-by-ingredient takes excessive time.
- **Mixed Plates:** A single plate frequently contains multiple distinct food items served together.

**MadiFood** solves this by leveraging multimodal computer vision and LLM reasoning, allowing users to simply photograph their meal or isolate specific dishes on their plate to get comprehensive nutritional breakdowns in seconds.

---

## ✨ Key Features

- **📸 Multimodal AI Vision Scan:** Instantly analyzes food photos to estimate total calories, macronutrients (protein, carbs, fats), health grade, and predicted ingredients.
- **✏️ Interactive Pixel Annotation:** On-screen touch canvas (`react-native-svg` + `PanResponder`) allows users to draw a boundary around a specific food on a crowded plate for targeted AI analysis.
- **🍽️ Dynamic Serving Size Controller:** Real-time scaling of nutritional data with interactive stepper buttons (0.5x, 1x, 1.5x, 2x) that instantly recalculates macros and updates the UI.
- **👨‍🍳 AI Healthy Chef Mode:** Specialized engineered pipeline that suggests personalized healthier swaps (e.g., olive oil instead of excess ghee, brown basmati rice) and provides step-by-step healthy cooking instructions.
- **📜 Menu X-Ray Scan:** Point the camera at any physical restaurant menu to categorize dishes using an intuitive Traffic Light health system (Green for healthy, Yellow for moderate, Red for treats).
- **💡 Smart Diet Balancing:** Context-aware meal recommendations that suggest culturally tailored dishes to balance daily nutritional deficits.
- **📊 Interactive Health Dashboard:** Custom SVG health rings and metrics to track daily calorie targets and nutritional goals.
- **💾 Local Persistence:** FileSystem-backed storage for past meal scans, daily history, and macro analytics.

---

## 🏗️ System Architecture

```
┌────────────────────────────────────────────────────────┐
│                   React Native (Expo)                  │
│  - Interactive Drawing Canvas (PanResponder + SVG)     │
│  - Serving Size Controller & Dynamic Health Rings      │
│  - View-Shot Image Snapshotting & Base64 Encoder       │
└───────────────────────────┬────────────────────────────┘
                            │ REST API (JSON / Base64)
                            ▼
┌────────────────────────────────────────────────────────┐
│                   Python Flask Backend                 │
│  - Request preprocessing & image validation            │
│  - Specialized nutritional prompt orchestration        │
│  - Robust JSON response extraction & error handling    │
└───────────────────────────┬────────────────────────────┘
                            │ Google GenAI SDK
                            ▼
┌────────────────────────────────────────────────────────┐
│               Google Gemini 1.5 Flash                  │
│  - Multimodal Vision feature extraction                │
│  - Ingredient detection & macro reasoning             │
│  - Health score computation & recipe recommendations   │
└────────────────────────────────────────────────────────┘
```

---

## 🛠️ Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Mobile Frontend** | React Native, Expo SDK 54, React Native SVG, Animated API, React Native View Shot |
| **Backend Microservice** | Python 3.10+, Flask, Flask-CORS, python-dotenv |
| **AI & Multimodal Vision** | Google Gemini 1.5 Flash (via official `google-genai` SDK) |
| **Data & Storage** | Local FileSystem Persistence (`historyService.js`) |

---

## 🚀 Getting Started

### Prerequisites

Make sure you have the following installed:
- [Node.js](https://nodejs.org/) (v18+) & `npm`
- [Python](https://www.python.org/) (v3.10+)
- [Expo Go](https://expo.dev/go) app installed on your physical mobile device (Android or iOS)
- A **Google Gemini API Key** from [Google AI Studio](https://aistudio.google.com/)

---

### 1. Backend Setup (Flask Server)

```powershell
# Navigate into the project directory
cd MadiFoodApp-main

# Create and activate a Python virtual environment
python -m venv .venv
.\.venv\Scripts\activate      # On Windows
# source .venv/bin/activate    # On macOS/Linux

# Install backend dependencies
pip install -r requirements.txt

# Create your .env file with your Gemini API key
echo "GEMINI_API_KEY=your_actual_gemini_api_key_here" > .env

# Start the Flask API server
python app_api.py
```

The Flask server will start broadcasting on `http://0.0.0.0:5000`.

---

### 2. Frontend Setup (React Native / Expo)

Open a **second terminal** in the project directory:

```bash
# Install frontend dependencies
npm install

# Start the Expo development server
npx expo start --clear
```

1. Ensure your computer and physical mobile device are connected to the **same Wi-Fi network**.
2. Scan the generated QR code using the **Expo Go** app (Android) or the default Camera app (iOS).
3. The app will connect automatically to your local backend API!

---

## 📁 Repository Structure

```
├── assets/                  # App icons, splash screens, and media assets
├── components/
│   └── HealthRings.js       # Dynamic SVG circular macro rings component
├── App.js                   # Core mobile UI, gesture tracking, and app workflows
├── app_api.py               # Flask REST API handling Gemini Vision & AI reasoning
├── config.js                # Network discovery and API endpoint configurations
├── historyService.js        # File-based offline persistence manager
├── package.json             # Frontend dependencies and Expo scripts
├── requirements.txt         # Python backend dependencies
└── README.md                # Project documentation
```

---

## 👥 Contributors

- **Sonia Salman** — [@soniasalmann](https://github.com/soniasalmann)
- **Asfa Hashmi** — [@asfahashmi44-coder](https://github.com/asfahashmi44-coder)
- **Zaid Ahmed** — [@sherbill2005](https://github.com/sherbill2005)

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
