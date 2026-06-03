# 🍏 MadiFoodApp - AI Nutrition Analyzer

An AI-powered mobile application that analyzes food nutritional content from images using **Google Gemini 2.0/Flash**.

---

## ✨ Features

- **📸 Food Image Analysis** — Pick a food photo and get instant calorie & macro data from AI.
- **✏️ Free-Shape Food Selection** — Draw a green outline around a specific food item in an image with multiple dishes. The AI will analyze ONLY the food you selected.
- **🖥️ Full-Screen Editing** — After picking an image, a dedicated editing screen opens where you can draw on the image before analyzing.
- **🤖 Smart AI Prompts** — The backend automatically switches between a general prompt and an annotation-aware prompt depending on whether you drew on the image.

---

## 🚀 1. Prerequisites (Must Install These First)

Before you start, make sure you have the following installed on your computer:
1.  **Node.js (LTS Version):** [Download here](https://nodejs.org/)
2.  **Python (3.10 or higher):** [Download here](https://www.python.org/downloads/)
3.  **Expo Go App:** Install this on your physical iPhone or Android from the App Store/Play Store.

---

## 🐍 2. Backend Setup (The AI Server)

The backend handles the communication with Google Gemini and processes the images.

1.  **Open a terminal** in the project root folder.
2.  **Create a Virtual Environment:**
    ```powershell
    python -m venv venv
    ```
3.  **Activate the Virtual Environment:**
    - **Windows:** `.\venv\Scripts\activate`
    - **Mac/Linux:** `source venv/bin/activate`
4.  **Install Requirements:**
    ```powershell
    pip install -r requirements.txt
    ```
5.  **Configure API Key:**
    - Create a file named `.env` in the root directory.
    - Inside `.env`, add your Gemini API Key:
      ```text
      GEMINI_API_KEY=your_key_here
      ```
      *(Get a free key at [Google AI Studio](https://aistudio.google.com/))*

---

## 📱 3. Frontend Setup (The Mobile App)

1.  **Open a SECOND terminal** (leave the backend one open).
2.  **Install Dependencies:**
    ```powershell
    npm install --legacy-peer-deps
    ```
    This will install all required packages including:
    - `react-native-svg` — Used for drawing the green selection outline on images
    - `react-native-view-shot` — Used to capture the annotated image (drawing + photo combined)
3.  **Find your Local IP Address:**
    - Open CMD/PowerShell and type: `ipconfig`
    - Look for **IPv4 Address** (e.g., `192.168.1.107`).
4.  **Update the API URL:**
    - Open `App.js`.
    - Find the `fetch` URL (around line ~90) and update it with **YOUR** IP address:
      ```javascript
      let response = await fetch('http://YOUR_IP_HERE:5000/analyze', { ... })
      ```

---

## 🏃 4. How to Run Everything

### **Step A: Start the Backend**
In your first terminal (the one with `venv` activated):
```powershell
python app_api.py
```
*You should see: "AI Backend (Gemini 1.5 Flash) running on http://0.0.0.0:5000"*

### **Step B: Start the Frontend**
In your second terminal:
```powershell
npx expo start --clear
```

### **Step C: Connect your Phone**
1.  Connect your phone to the **EXACT SAME Wi-Fi** as your computer.
2.  Open **Expo Go** on your phone.
3.  Scan the QR code from the terminal.

### **Step D: Using Free-Shape Food Selection**
1.  Tap **📸 Select Food Image** and pick a photo.
2.  A full-screen editing page will open with the image.
3.  **Draw a green outline** with your finger around the specific food item you want to analyze.
4.  Tap **🔍 Analyze Selected** to get macros for only the circled food.
5.  Or tap **🍽️ Analyze Full Image** to skip drawing and analyze the whole photo.
6.  Use **↺ Clear** in the top-right to erase your drawing and start over.

---

## 🛠 5. Troubleshooting (If it fails)

### **🔥 DISABLE WINDOWS FIREWALL (Crucial!)**
If your phone says "Backend connection dropped", your computer's firewall is blocking your phone.
1.  Go to **Windows Search** -> "Windows Defender Firewall".
2.  Click **"Turn Windows Defender Firewall on or off"**.
3.  Select **"Turn off Windows Defender Firewall"** for both Private and Public networks.
4.  Try the "Analyze" button again.

### **"Project is incompatible" Error**
If Expo Go says the version is wrong, run this in the frontend terminal:
`npx expo install --fix`

### **"Cannot find module google.genai"**
Make sure you activated the `venv` (`.\venv\Scripts\activate`) before running the backend.

---

## 👨‍💻 Tech Stack
- **Frontend:** React Native (Expo SDK 54)
- **Backend:** Python Flask
- **AI:** Google Gemini 1.5 Flash / 2.0 Flash
- **Image Handling:** Base64 Encoding
- **Drawing:** react-native-svg (green outline), react-native-view-shot (image capture)
