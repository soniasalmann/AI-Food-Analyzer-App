import Constants from 'expo-constants';

/**
 * Dynamically determines the backend API URL.
 * When running in Expo Go, it uses the IP of the machine running Metro.
 */
const getApiUrl = () => {
  // Constants.expoConfig.hostUri typically looks like "192.168.1.102:8081"
  const hostUri = Constants.expoConfig?.hostUri;
  
  if (!hostUri) {
    // Fallback for production or when hostUri is unavailable
    return 'http://localhost:5000';
  }

  // Extract the IP address (everything before the colon)
  const ip = hostUri.split(':')[0];
  
  return `http://${ip}:5000`;
};

export const API_URL = getApiUrl();
export const ANALYZE_ENDPOINT = `${API_URL}/analyze`;
export const RECOMMENDATIONS_ENDPOINT = `${API_URL}/recommendations`;
export const MENU_ENDPOINT = `${API_URL}/analyze_menu`;

console.log('Backend API URL initialized as:', API_URL);
