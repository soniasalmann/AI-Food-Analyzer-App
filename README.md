# 🍏 MadiFoodApp - AI Nutrition Assistant

An advanced AI-powered mobile application that provides comprehensive nutritional analysis, meal recommendations, and menu scanning using **Google Gemini AI**.

---

## ✨ Key Features

- **📸 AI Vision Scan** — Instantly analyze food images with high-tech laser scanning animations.
- **📜 Menu X-Ray** — Scan any restaurant menu to see a color-coded "Traffic Light" health system (Green/Yellow/Red).
- **👨‍🍳 AI Healthy Chef** — Automatically generate improved recipes and healthy swaps for any scanned dish.
- **🔍 Deep Ingredient Detection** — Predicted ingredient breakdown for every meal.
- **📊 Interactive Dashboard** — Professional health rings for daily goal tracking.
- **💡 Smart Recommendations** — Context-aware South Asian meal suggestions based on nutritional gaps.
- **📤 Macro Snapshots** — Export professional nutrition report cards for social sharing.
- **💾 Persistent History** — Reliable file-based storage for all past scans.

---

## 🛠️ Tech Stack

- **Frontend:** React Native (Expo SDK 54)
- **Backend:** Python Flask
- **AI:** Google Gemini 1.5 Flash / 2.0 Flash (latest SDK)
- **Image Handling:** Base64 Encoding & View-Shot
- **Storage:** Local FileSystem Persistence
- **Visualization:** react-native-svg

---

## 🚀 Setup Instructions

### 1. Prerequisites
- **Node.js & npm** installed.
- **Python 3.10+** installed.
- **Gemini API Key** (Get it from [Google AI Studio](https://aistudio.google.com/)).

### 2. Backend Setup (Flask)
```powershell
# Create virtual environment
python -m venv venv
.\venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file and add your key
echo "GEMINI_API_KEY=YOUR_KEY_HERE" > .env

# Run the backend
python app_api.py
```

### 3. Frontend Setup (Expo)
```bash
# Install dependencies
npm install

# Start the app
npx expo start
```
- Download **Expo Go** on your phone.
- Ensure phone and computer are on the **same Wi-Fi**.
- **The app automatically detects your computer's IP address.**

---

## 🏗️ Project Architecture
- `App.js`: Core mobile UI and interactive logic.
- `app_api.py`: AI Backend server with specialized nutrition endpoints.
- `historyService.js`: Robust file-based persistence layer.
- `config.js`: Dynamic discovery for backend endpoints.
- `components/HealthRings.js`: Premium SVG visualization component.

---

## 📄 License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
