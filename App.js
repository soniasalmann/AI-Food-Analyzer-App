import React, { useState, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image, ActivityIndicator, ScrollView, PanResponder, Dimensions, StatusBar } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import Svg, { Polyline } from 'react-native-svg';
import { captureRef } from 'react-native-view-shot';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const IMAGE_SIZE = SCREEN_WIDTH - 40; // Nearly full width with some padding

export default function App() {
  const [image, setImage] = useState(null);
  const [base64Data, setBase64Data] = useState(null);
  const [loading, setLoading] = useState(false);
  const [nutritionData, setNutritionData] = useState(null);
  const [paths, setPaths] = useState([]);
  const [currentPath, setCurrentPath] = useState([]);
  const [editMode, setEditMode] = useState(false); // true = show the editing/drawing screen
  const [servingSize, setServingSize] = useState('Medium'); // Serving size selector
  const imageContainerRef = useRef(null);

  // Serving size multipliers
  const SERVING_OPTIONS = [
    { label: 'Small', multiplier: 0.5, emoji: '🍽️' },
    { label: 'Medium', multiplier: 1.0, emoji: '🍽️🍽️' },
    { label: 'Large', multiplier: 1.5, emoji: '🍽️🍽️🍽️' },
    { label: 'Extra Large', multiplier: 2.0, emoji: '🍽️🍽️🍽️🍽️' },
  ];

  const getMultiplier = () => {
    const option = SERVING_OPTIONS.find(o => o.label === servingSize);
    return option ? option.multiplier : 1.0;
  };

  const getAdjustedValue = (value) => {
    if (value === undefined || value === null) return 0;
    return Math.round(Number(value) * getMultiplier());
  };

  // PanResponder handles finger drawing on the image
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        setCurrentPath([`${locationX},${locationY}`]);
      },
      onPanResponderMove: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        setCurrentPath((prev) => [...prev, `${locationX},${locationY}`]);
      },
      onPanResponderRelease: () => {
        setCurrentPath((prev) => {
          if (prev.length > 2) {
            const closedPath = [...prev, prev[0]];
            setPaths((existing) => [...existing, closedPath]);
          }
          return [];
        });
      },
    })
  ).current;

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false, // Skip system crop — we handle editing ourselves
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
      setBase64Data(result.assets[0].base64);
      setNutritionData(null);
      setPaths([]);
      setCurrentPath([]);
      setServingSize('Medium');
      setEditMode(true);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      alert('Camera permission is required to take photos!');
      return;
    }

    let result = await ImagePicker.launchCameraAsync({
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
      setBase64Data(result.assets[0].base64);
      setNutritionData(null);
      setPaths([]);
      setCurrentPath([]);
      setServingSize('Medium');
      setEditMode(true);
    }
  };

  const clearDrawing = () => {
    setPaths([]);
    setCurrentPath([]);
  };

  const cancelEdit = () => {
    setEditMode(false);
    setImage(null);
    setBase64Data(null);
    setPaths([]);
    setCurrentPath([]);
  };

  const analyzeImage = async () => {
    if (!base64Data) {
      alert("Please select a food image first!");
      return;
    }
    setLoading(true);

    try {
      let imageToSend = base64Data;
      const hasDrawing = paths.length > 0;

      // IMPORTANT: Capture the view BEFORE exiting edit mode,
      // because setEditMode(false) unmounts the image view
      if (hasDrawing && imageContainerRef.current) {
        console.log("Capturing annotated image with drawing...");
        const uri = await captureRef(imageContainerRef, {
          format: 'jpg',
          quality: 0.5,
          result: 'base64',
          width: 400,
          height: 400,
        });
        imageToSend = uri;
        console.log("Captured image size:", Math.round(uri.length * 3 / 4 / 1024), "KB");
      }

      // Now safe to exit edit mode — capture is done
      setEditMode(false);

      console.log("Sending image to Flask backend...");
      
      // 60-second timeout so the request doesn't hang forever
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);

      let response = await fetch('http://10.126.152.61:5000/analyze', {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image_data: imageToSend,
          has_annotation: hasDrawing,
        }),
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Server returned error status: ${response.status}`);
      }

      let data = await response.json();
      console.log("Macros pulled successfully:", data);
      setNutritionData(data);
    } catch (error) {
      if (error.name === 'AbortError') {
        alert("Request timed out. The server took too long to respond. Please try again.");
      } else {
        alert("Backend connection dropped. Ensure python app_api.py is running!");
      }
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // ========== EDITING SCREEN (full screen drawing overlay) ==========
  if (editMode && image) {
    return (
      <View style={styles.editScreen}>
        <StatusBar barStyle="light-content" />
        
        {/* Top bar */}
        <View style={styles.editTopBar}>
          <TouchableOpacity onPress={cancelEdit}>
            <Text style={styles.editTopButtonText}>✕ Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.editTitle}>Select Food</Text>
          <TouchableOpacity onPress={clearDrawing}>
            <Text style={[styles.editTopButtonText, paths.length === 0 && { opacity: 0.3 }]}>
              ↺ Clear
            </Text>
          </TouchableOpacity>
        </View>

        {/* Hint */}
        <Text style={styles.editHint}>✏️ Draw around the food item you want to analyze</Text>

        {/* Image + Drawing area */}
        <View
          ref={imageContainerRef}
          style={styles.editImageContainer}
          collapsable={false}
        >
          <Image source={{ uri: image }} style={styles.editImage} resizeMode="contain" />
          
          <View
            style={styles.editDrawingOverlay}
            {...panResponder.panHandlers}
          >
            <Svg height={IMAGE_SIZE} width={IMAGE_SIZE}>
              {paths.map((path, index) => (
                <Polyline
                  key={index}
                  points={path.join(' ')}
                  fill="none"
                  stroke="#00ff66"
                  strokeWidth="3.5"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              ))}
              {currentPath.length > 0 && (
                <Polyline
                  points={currentPath.join(' ')}
                  fill="none"
                  stroke="#00ff66"
                  strokeWidth="3.5"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              )}
            </Svg>
          </View>
        </View>

        {/* Bottom action buttons */}
        <View style={styles.editBottomBar}>
          <TouchableOpacity
            style={[styles.editActionButton, styles.editSkipButton]}
            onPress={() => { setPaths([]); analyzeImage(); }}
          >
            <Text style={styles.editSkipButtonText}>🍽️ Analyze Full Image</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.editActionButton,
              styles.editAnalyzeButton,
              paths.length === 0 && { opacity: 0.4 },
            ]}
            onPress={analyzeImage}
            disabled={paths.length === 0}
          >
            <Text style={styles.editAnalyzeButtonText}>🔍 Analyze Selected</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ========== MAIN SCREEN (home + results) ==========
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <StatusBar barStyle="light-content" />
      <Text style={styles.title}>AI Food Analyzer</Text>
      
      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.buttonHalf} onPress={pickImage}>
          <Text style={styles.buttonEmoji}>🖼️</Text>
          <Text style={styles.buttonText}>Gallery</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.buttonHalf} onPress={takePhoto}>
          <Text style={styles.buttonEmoji}>📷</Text>
          <Text style={styles.buttonText}>Camera</Text>
        </TouchableOpacity>
      </View>

      {image && (
        <View style={styles.resultImageSection}>
          <Image source={{ uri: image }} style={styles.resultImage} />
          <TouchableOpacity style={styles.retakeButton} onPress={pickImage}>
            <Text style={styles.retakeButtonText}>📷 Pick Another</Text>
          </TouchableOpacity>
        </View>
      )}

      {loading && (
        <View style={styles.loadingSection}>
          <ActivityIndicator size="large" color="#00ffcc" />
          <Text style={styles.loadingText}>Analyzing your food...</Text>
        </View>
      )}

      {nutritionData && (
        <View style={styles.card}>
          <Text style={styles.foodName}>{nutritionData.food_name || "Analysis Result"}</Text>
          {nutritionData.description ? (
            <Text style={styles.descriptionText}>"{nutritionData.description}"</Text>
          ) : null}

          {/* Serving Size Selector */}
          <Text style={styles.servingLabel}>📏 Serving Size</Text>
          <View style={styles.servingRow}>
            {SERVING_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.label}
                style={[
                  styles.servingButton,
                  servingSize === option.label && styles.servingButtonActive,
                ]}
                onPress={() => setServingSize(option.label)}
              >
                <Text style={[
                  styles.servingButtonText,
                  servingSize === option.label && styles.servingButtonTextActive,
                ]}>
                  {option.label}
                </Text>
                <Text style={styles.servingMultiplierText}>
                  {option.multiplier}x
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.divider} />
          <Text style={styles.macroText}>🔥 Calories: {getAdjustedValue(nutritionData.calories)} kcal</Text>
          <Text style={styles.macroText}>🥩 Protein: {getAdjustedValue(nutritionData.protein)}g</Text>
          <Text style={styles.macroText}>🍞 Carbs: {getAdjustedValue(nutritionData.carbs)}g</Text>
          <Text style={styles.macroText}>🥑 Fats: {getAdjustedValue(nutritionData.fat)}g</Text>
          
          {servingSize !== 'Medium' && (
            <Text style={styles.servingNote}>
              Values adjusted for {servingSize.toLowerCase()} serving ({getMultiplier()}x)
            </Text>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // ========== MAIN SCREEN STYLES ==========
  container: {
    flexGrow: 1,
    backgroundColor: '#121212',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 30,
    marginTop: 40,
  },
  button: {
    backgroundColor: '#1f1f1f',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#333',
    marginBottom: 20,
    width: '90%',
    alignItems: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    width: '90%',
    marginBottom: 20,
  },
  buttonHalf: {
    flex: 1,
    backgroundColor: '#1f1f1f',
    paddingVertical: 18,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
    alignItems: 'center',
  },
  buttonEmoji: {
    fontSize: 24,
    marginBottom: 6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  resultImageSection: {
    alignItems: 'center',
    marginVertical: 10,
  },
  resultImage: {
    width: 200,
    height: 200,
    borderRadius: 15,
  },
  retakeButton: {
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#1f1f1f',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  retakeButtonText: {
    color: '#aaa',
    fontSize: 13,
  },
  loadingSection: {
    marginTop: 20,
    alignItems: 'center',
  },
  loadingText: {
    color: '#888',
    marginTop: 10,
    fontSize: 14,
  },
  card: {
    backgroundColor: '#1e1e1e',
    borderRadius: 15,
    padding: 20,
    width: '90%',
    borderWidth: 1,
    borderColor: '#333',
    marginTop: 20,
  },
  foodName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#00ffcc',
    marginBottom: 5,
    textAlign: 'center',
  },
  descriptionText: {
    fontSize: 16,
    fontStyle: 'italic',
    color: '#aaa',
    textAlign: 'center',
    marginBottom: 10,
    paddingHorizontal: 10,
  },
  divider: {
    height: 1,
    backgroundColor: '#333',
    marginVertical: 10,
  },
  macroText: {
    fontSize: 18,
    color: '#ddd',
    marginVertical: 5,
  },
  servingLabel: {
    fontSize: 14,
    color: '#888',
    marginTop: 10,
    marginBottom: 8,
    textAlign: 'center',
  },
  servingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
    marginBottom: 5,
  },
  servingButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 8,
    backgroundColor: '#2a2a2a',
    borderWidth: 1,
    borderColor: '#333',
    alignItems: 'center',
  },
  servingButtonActive: {
    backgroundColor: '#00ffcc20',
    borderColor: '#00ffcc',
  },
  servingButtonText: {
    fontSize: 11,
    color: '#888',
    fontWeight: '600',
  },
  servingButtonTextActive: {
    color: '#00ffcc',
  },
  servingMultiplierText: {
    fontSize: 10,
    color: '#555',
    marginTop: 2,
  },
  servingNote: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 10,
  },

  // ========== EDITING SCREEN STYLES ==========
  editScreen: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    paddingTop: 50,
    alignItems: 'center',
  },
  editTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  editTopButtonText: {
    color: '#00ffcc',
    fontSize: 15,
    fontWeight: '600',
  },
  editTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  editHint: {
    color: '#666',
    fontSize: 13,
    fontStyle: 'italic',
    marginBottom: 15,
  },
  editImageContainer: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#000',
  },
  editImage: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
  },
  editDrawingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
  },
  editBottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 20,
    marginTop: 20,
    gap: 10,
  },
  editActionButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  editSkipButton: {
    backgroundColor: '#1f1f1f',
    borderWidth: 1,
    borderColor: '#333',
  },
  editSkipButtonText: {
    color: '#ccc',
    fontSize: 14,
    fontWeight: 'bold',
  },
  editAnalyzeButton: {
    backgroundColor: '#00ffcc',
  },
  editAnalyzeButtonText: {
    color: '#121212',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
