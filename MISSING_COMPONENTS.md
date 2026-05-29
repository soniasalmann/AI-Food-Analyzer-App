# Missing Components - MadiFoodApp

This document tracks the features and infrastructure components required to make MadiFoodApp a fully functional, production-ready application.

## 🔴 Critical Infrastructure
- [ ] **Backend API Implementation:** Create `app_api.py` using Flask to handle image processing and macro analysis.
- [ ] **AI Model Integration:** Integrate a vision model (e.g., Gemini Pro Vision, OpenAI GPT-4o, or a custom model) to identify food and estimate macros.
- [ ] **Dynamic API Configuration:** Move the hardcoded `http://127.0.0.1:5000` to an environment variable or a configuration file that supports physical device testing (using local network IP).

## 🛠️ Functional Features
- [ ] **Camera Access:** Integrate `expo-camera` to allow users to take live photos of their food.
- [ ] **Local Scan History:** Implement `@react-native-async-storage/async-storage` or `expo-sqlite` to save previous scans locally.
- [ ] **User Authentication:** Add a login/signup system (Firebase, Supabase, or custom JWT) to sync data across devices.
- [ ] **Multi-Screen Navigation:** Implement `react-navigation` to add "History", "Profile", and "Settings" tabs.

## ✨ Polish & Robustness
- [ ] **Input Validation:** Implement a pre-check to ensure the uploaded image contains food before sending it to the API.
- [ ] **Detailed Nutritional Breakdown:** Expand analysis to include fiber, sugar, vitamins, and serving size estimates.
- [ ] **Offline Mode:** Add basic UI feedback and cached data for when the device is offline.
- [ ] **Custom Branding:** Replace default Expo assets with custom icons, splash screens, and a consistent color palette.
- [ ] **Error Handling:** Improve UI feedback for backend connection timeouts or invalid image formats.
