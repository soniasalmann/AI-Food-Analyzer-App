import * as FileSystem from 'expo-file-system';

const HISTORY_FILE = FileSystem.documentDirectory + 'food_history.json';
let inMemoryHistory = [];

/**
 * Saves a new scan result to local history.
 */
export const saveToHistory = async (nutritionData) => {
  try {
    // 1. Load existing history
    const history = await getHistory();

    // 2. Add new entry
    const newEntry = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      ...nutritionData,
    };

    const updatedHistory = [newEntry, ...history].slice(0, 50);
    inMemoryHistory = updatedHistory;

    // 3. Save to file
    await FileSystem.writeAsStringAsync(HISTORY_FILE, JSON.stringify(updatedHistory));
    
    return updatedHistory;
  } catch (error) {
    console.warn('File Storage Error (Saving):', error);
    return inMemoryHistory;
  }
};

/**
 * Loads the full scan history from file.
 */
export const getHistory = async () => {
  try {
    const fileInfo = await FileSystem.getInfoAsync(HISTORY_FILE);
    
    if (fileInfo.exists) {
      const content = await FileSystem.readAsStringAsync(HISTORY_FILE);
      inMemoryHistory = JSON.parse(content);
      return inMemoryHistory;
    }
    
    return inMemoryHistory;
  } catch (error) {
    console.warn('File Storage Error (Loading):', error);
    return inMemoryHistory;
  }
};

/**
 * Clears all history.
 */
export const clearHistory = async () => {
  try {
    const fileInfo = await FileSystem.getInfoAsync(HISTORY_FILE);
    if (fileInfo.exists) {
      await FileSystem.deleteAsync(HISTORY_FILE);
    }
    inMemoryHistory = [];
    return true;
  } catch (error) {
    console.warn('File Storage Error (Clearing):', error);
    return false;
  }
};

/**
 * Deletes a specific history entry.
 */
export const deleteHistoryEntry = async (id) => {
  try {
    const history = await getHistory();
    const updatedHistory = history.filter(item => item.id !== id);
    
    inMemoryHistory = updatedHistory;
    await FileSystem.writeAsStringAsync(HISTORY_FILE, JSON.stringify(updatedHistory));
    
    return updatedHistory;
  } catch (error) {
    console.warn('File Storage Error (Deleting):', error);
    return inMemoryHistory;
  }
};
