import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image, ActivityIndicator, ScrollView, PanResponder, Dimensions, StatusBar, Animated, Easing, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import Svg, { Polyline } from 'react-native-svg';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { ANALYZE_ENDPOINT, RECOMMENDATIONS_ENDPOINT, MENU_ENDPOINT } from './config';
import * as HistoryService from './historyService';
import { HealthRings } from './components/HealthRings';

// Mapping for local recommendation images
const LOCAL_FOOD_IMAGES = {
  'dal tadka': require('./assets/Dal-tadka.jpg'),
  'palak paneer': require('./assets/palak-paneer.jpg'),
  'tandoori chicken': require('./assets/tandoori-chicken.jpg'),
};

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const IMAGE_SIZE = SCREEN_WIDTH - 40; // Nearly full width with some padding

export default function App() {
  const [image, setImage] = useState(null);
  const [base64Data, setBase64Data] = useState(null);
  const [loading, setLoading] = useState(false);
  const [nutritionData, setNutritionData] = useState(null);
  const [paths, setPaths] = useState([]);
  const [currentPath, setCurrentPath] = useState([]);
  const [editMode, setEditMode] = useState(false);
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [recommendations, setRecommendations] = useState([]);
  const [showRecipe, setShowRecipe] = useState(false);
  const [menuResults, setMenuResults] = useState(null);
  const [showMenuAnalysis, setShowMenuAnalysis] = useState(false);
  const [servingQuantity, setServingQuantity] = useState(1);
  const imageContainerRef = useRef(null);
  const resultCardRef = useRef(null);
  const scanAnim = useRef(new Animated.Value(0)).current;

  // ... (previous effects)

  const pickMenuImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled) {
      analyzeMenu(result.assets[0].base64);
    }
  };

  const analyzeMenu = async (base64) => {
    setLoading(true);
    try {
      let response = await fetch(MENU_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_data: base64 }),
      });
      let data = await response.json();
      setMenuResults(data);
      setShowMenuAnalysis(true);
    } catch (error) {
      Alert.alert("Analysis Failed", "Could not read menu.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  useEffect(() => {
    fetchRecommendations();
  }, [history]);

  const loadHistory = async () => {
    const data = await HistoryService.getHistory();
    setHistory(data);
  };

  const fetchRecommendations = async () => {
    try {
      const dailyTotals = getDailyTotals();
      const response = await fetch(RECOMMENDATIONS_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ daily_totals: dailyTotals }),
      });
      const data = await response.json();
      setRecommendations(data);
    } catch (error) {
      console.error("Failed to fetch recommendations:", error);
    }
  };

  const shareSnapshot = async () => {
    if (!resultCardRef.current) return;
    
    try {
      setLoading(true);
      const uri = await captureRef(resultCardRef.current, {
        format: 'png',
        quality: 0.9,
      });
      
      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        dialogTitle: 'Share your Nutrition Report',
        UTI: 'public.png',
      });
    } catch (error) {
      Alert.alert("Sharing Failed", "Could not generate report card.");
    } finally {
      setLoading(false);
    }
  };

  // Animation for scanning line
  useEffect(() => {
    if (loading) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(scanAnim, {
            toValue: 1,
            duration: 2000,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
          Animated.timing(scanAnim, {
            toValue: 0,
            duration: 2000,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      scanAnim.stopAnimation();
      scanAnim.setValue(0);
    }
  }, [loading]);

  const getDailyTotals = () => {
    const today = new Date().toLocaleDateString();
    const todaysHistory = history.filter(item => new Date(item.timestamp).toLocaleDateString() === today);
    
    return todaysHistory.reduce((acc, item) => ({
      calories: acc.calories + (item.calories || 0),
      protein: acc.protein + (item.protein || 0),
      carbs: acc.carbs + (item.carbs || 0),
      fat: acc.fat + (item.fat || 0),
    }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
  };

  const ScanningLine = () => (
    <Animated.View
      style={[
        styles.scanLine,
        {
          transform: [{
            translateY: scanAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, IMAGE_SIZE],
            })
          }]
        }
      ]}
    />
  );

  const getTrafficColor = (category) => {
    if (category === 'Green') return '#00ff66';
    if (category === 'Yellow') return '#ffcc00';
    if (category === 'Red') return '#ff4444';
    return '#888';
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
      mediaTypes: ['images'], // Using string array as per common Expo 54 patterns
      allowsEditing: false, 
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
      setBase64Data(result.assets[0].base64);
      setNutritionData(null);
      setPaths([]);
      setCurrentPath([]);
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

  const analyzeImage = async (forceSkipDrawing = false) => {
    if (!base64Data) {
      alert("Please select a food image first!");
      return;
    }
    setLoading(true);

    try {
      let imageToSend = base64Data;
      const hasDrawing = paths.length > 0 && !forceSkipDrawing;

      // IMPORTANT: Capture the view BEFORE exiting edit mode,
      // because setEditMode(false) unmounts the image view
      if (hasDrawing && imageContainerRef.current) {
        console.log("Capturing annotated image with drawing...");
        // Small delay to ensure any pending renders or layout changes are finished
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const uri = await captureRef(imageContainerRef.current, {
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

      let response = await fetch(ANALYZE_ENDPOINT, {
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
      setServingQuantity(1); // Reset serving quantity for new scan
      
      // Save to local history
      const updatedHistory = await HistoryService.saveToHistory(data);
      if (updatedHistory) setHistory(updatedHistory);
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
            onPress={() => analyzeImage(true)}
          >
            <Text style={styles.editSkipButtonText}>🍽️ Analyze Full Image</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.editActionButton,
              styles.editAnalyzeButton,
              paths.length === 0 && { opacity: 0.4 },
            ]}
            onPress={() => analyzeImage(false)}
            disabled={paths.length === 0}
          >
            <Text style={styles.editAnalyzeButtonText}>🔍 Analyze Selected</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ========== HISTORY SCREEN ==========
  if (showHistory) {
    return (
      <View style={styles.historyScreen}>
        <StatusBar barStyle="light-content" />
        <View style={styles.editTopBar}>
          <TouchableOpacity onPress={() => setShowHistory(false)}>
            <Text style={styles.editTopButtonText}>✕ Close</Text>
          </TouchableOpacity>
          <Text style={styles.editTitle}>Scan History</Text>
          <TouchableOpacity onPress={() => {
            Alert.alert(
              "Clear History",
              "Are you sure you want to delete all scans?",
              [
                { text: "Cancel", style: "cancel" },
                { 
                  text: "Clear All", 
                  style: "destructive",
                  onPress: async () => {
                    await HistoryService.clearHistory();
                    setHistory([]);
                  }
                }
              ]
            );
          }}>
            <Text style={[styles.editTopButtonText, { color: '#ff4444' }]}>🗑️ Clear</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.historyList}>
          {history.length === 0 ? (
            <Text style={styles.emptyHistoryText}>No scans yet. Try analyzing some food!</Text>
          ) : (
            history.map((item) => (
              <View key={item.id} style={styles.historyCard}>
                <View style={styles.historyHeader}>
                  <Text style={styles.historyFoodName}>{item.food_name}</Text>
                  <Text style={styles.historyDate}>
                    {new Date(item.timestamp).toLocaleDateString()}
                  </Text>
                </View>
                <View style={styles.historyMacros}>
                  <Text style={styles.historyMacroItem}>🔥 {item.calories} kcal</Text>
                  <Text style={styles.historyMacroItem}>🥩 {item.protein}g</Text>
                  <Text style={styles.historyMacroItem}>🍞 {item.carbs}g</Text>
                  <Text style={styles.historyMacroItem}>🥑 {item.fat}g</Text>
                </View>
                <TouchableOpacity 
                  style={styles.deleteEntryButton}
                  onPress={async () => {
                    const updated = await HistoryService.deleteHistoryEntry(item.id);
                    if (updated) setHistory(updated);
                  }}
                >
                  <Text style={styles.deleteEntryText}>Remove</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </ScrollView>
      </View>
    );
  }

  // ========== MAIN SCREEN (home + results) ==========
  const dailyTotals = getDailyTotals();

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <View style={styles.mainTopBar}>
        <View>
          <Text style={styles.dashboardGreeting}>Hello, User! 👋</Text>
          <Text style={styles.dashboardSub}>Track your daily goals</Text>
        </View>
        <TouchableOpacity style={styles.historyHeaderButton} onPress={() => setShowHistory(true)}>
          <Text style={styles.historyButtonText}>📜 History</Text>
        </TouchableOpacity>
      </View>

      {/* Daily Progress Dashboard */}
      {!nutritionData && !loading && (
        <View style={styles.dashboardCard}>
          <Text style={styles.dashboardTitle}>Daily Progress</Text>
          <HealthRings data={dailyTotals} />
        </View>
      )}

      {/* Recommended Meals Section */}
      {!nutritionData && !loading && recommendations.length > 0 && (
        <View style={styles.recommendationSection}>
          <Text style={styles.dashboardTitle}>💡 Recommended South Asian Meals</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recommendationScroll}>
            {recommendations.map((meal, index) => {
              const mealNameLower = meal.name.toLowerCase();
              const localImage = LOCAL_FOOD_IMAGES[mealNameLower];
              
              return (
                <View key={index} style={styles.mealCard}>
                  <Image 
                    source={localImage || { 
                      uri: `https://loremflickr.com/400/300/food,southasian,${(meal.image_query || meal.name).replace(/[^a-zA-Z0-9]+/g, ',')}` 
                    }} 
                    style={styles.mealImage} 
                    defaultSource={require('./assets/icon.png')}
                  />
                  <View style={styles.mealInfo}>
                    <Text style={styles.mealName}>{meal.name}</Text>
                    <Text style={styles.mealReason}>{meal.reason}</Text>
                    <View style={styles.mealMacros}>
                      <Text style={styles.mealMacroText}>🔥 {meal.calories} kcal</Text>
                      <Text style={styles.mealMacroText}>🥩 {meal.protein}g P</Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        </View>
      )}
      
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

      <TouchableOpacity style={styles.menuScanButton} onPress={pickMenuImage}>
        <Text style={styles.menuScanEmoji}>📜</Text>
        <View>
          <Text style={styles.menuScanText}>Menu X-Ray Scan</Text>
          <Text style={styles.menuScanSub}>Get health recommendations from any menu</Text>
        </View>
      </TouchableOpacity>

      {/* Menu Analysis Overlay */}
      {showMenuAnalysis && menuResults && (
        <View style={styles.menuAnalysisOverlay}>
          <View style={styles.editTopBar}>
            <TouchableOpacity onPress={() => setShowMenuAnalysis(false)}>
              <Text style={styles.editTopButtonText}>✕ Close</Text>
            </TouchableOpacity>
            <Text style={styles.editTitle}>Menu X-Ray Results</Text>
            <View style={{ width: 50 }} />
          </View>
          
          <ScrollView contentContainerStyle={styles.menuAnalysisList}>
            <Text style={styles.menuHint}>Traffic Light System: Pick Green for the healthiest options!</Text>
            {Array.isArray(menuResults) && menuResults.map((item, index) => (
              <View key={index} style={[styles.menuItemCard, { borderLeftColor: getTrafficColor(item.category) }]}>
                <View style={styles.menuItemHeader}>
                  <Text style={styles.menuItemName}>{item.item_name}</Text>
                  <View style={[styles.trafficLight, { backgroundColor: getTrafficColor(item.category) }]}>
                    <Text style={styles.trafficText}>{item.category}</Text>
                  </View>
                </View>
                <Text style={styles.menuItemReason}>{item.reason}</Text>
                <View style={styles.menuItemFooter}>
                  <Text style={styles.menuItemCal}>🔥 {item.estimated_calories} kcal</Text>
                  <Text style={styles.menuItemTip}>💡 {item.health_tip}</Text>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {loading && (
        <View style={styles.loadingSection}>
          <View style={styles.scanContainer}>
            <Image source={{ uri: image }} style={styles.scanImage} />
            <ScanningLine />
          </View>
          <Text style={styles.loadingText}>AI is scanning your food...</Text>
        </View>
      )}

      {nutritionData && (
        <View style={styles.card} ref={resultCardRef} collapsable={false}>
          <View style={styles.cardHeader}>
            <Text style={styles.foodName}>{nutritionData.food_name}</Text>
            <View style={styles.headerActions}>
              <TouchableOpacity onPress={shareSnapshot} style={styles.iconButton}>
                <Text style={styles.shareIcon}>📤</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setNutritionData(null); setShowRecipe(false); }}>
                <Text style={styles.closeCard}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          <HealthRings data={{
            ...nutritionData,
            calories: Math.round(nutritionData.calories * servingQuantity),
            protein: Math.round(nutritionData.protein * servingQuantity),
            carbs: Math.round(nutritionData.carbs * servingQuantity),
            fat: Math.round(nutritionData.fat * servingQuantity),
          }} />

          {/* Serving Size Controller */}
          <View style={styles.servingController}>
            <View>
              <Text style={styles.sectionLabel}>🍽️ Serving Size</Text>
              <Text style={styles.servingDesc}>
                {nutritionData.serving_size || "Standard serving"}
              </Text>
            </View>
            <View style={styles.stepper}>
              <TouchableOpacity 
                style={styles.stepButton} 
                onPress={() => setServingQuantity(Math.max(0.5, servingQuantity - 0.5))}
              >
                <Text style={styles.stepText}>-</Text>
              </TouchableOpacity>
              <Text style={styles.quantityText}>{servingQuantity}x</Text>
              <TouchableOpacity 
                style={styles.stepButton} 
                onPress={() => setServingQuantity(servingQuantity + 0.5)}
              >
                <Text style={styles.stepText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Deep Ingredients Section */}
          {nutritionData.ingredients && (
            <View style={styles.ingredientSection}>
              <Text style={styles.sectionLabel}>🔍 Predicted Ingredients</Text>
              <View style={styles.ingredientTags}>
                {nutritionData.ingredients.map((ing, i) => (
                  <View key={i} style={styles.ingTag}>
                    <Text style={styles.ingText}>{ing}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Healthy Chef Toggle */}
          <TouchableOpacity 
            style={[styles.chefToggle, showRecipe && styles.chefToggleActive]}
            onPress={() => setShowRecipe(!showRecipe)}
          >
            <Text style={styles.chefToggleText}>
              {showRecipe ? '📖 Hide Healthy Recipe' : '👨‍🍳 AI Healthy Chef Mode'}
            </Text>
          </TouchableOpacity>

          {showRecipe && nutritionData.healthy_recipe && (
            <Animated.View style={styles.recipeBox}>
              <Text style={styles.recipeTitle}>✨ How to improve this dish:</Text>
              {nutritionData.healthy_recipe.improvements.map((imp, i) => (
                <Text key={i} style={styles.recipeBullet}>• {imp}</Text>
              ))}
              
              <Text style={[styles.recipeTitle, { marginTop: 15 }]}>🍳 Quick Healthy Steps:</Text>
              {nutritionData.healthy_recipe.steps.map((step, i) => (
                <Text key={i} style={styles.recipeStep}>{i+1}. {step}</Text>
              ))}
            </Animated.View>
          )}

          {!showRecipe && nutritionData.insight ? (
            <View style={styles.insightBox}>
              <Text style={styles.insightTitle}>💡 AI Insight</Text>
              <Text style={styles.insightText}>{nutritionData.insight}</Text>
            </View>
          ) : null}

          {nutritionData.warnings && nutritionData.warnings.length > 0 && (
            <View style={styles.warningBox}>
              {nutritionData.warnings.map((w, i) => (
                <View key={i} style={styles.warningTag}>
                  <Text style={styles.warningText}>⚠️ {w}</Text>
                </View>
              ))}
            </View>
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
    backgroundColor: '#0a0a0a',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
  },
  dashboardGreeting: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
  },
  dashboardSub: {
    color: '#666',
    fontSize: 14,
  },
  dashboardCard: {
    backgroundColor: '#111',
    borderRadius: 20,
    padding: 20,
    width: '100%',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#222',
  },
  dashboardTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginBottom: 20,
  },
  buttonHalf: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    paddingVertical: 20,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#333',
    alignItems: 'center',
  },
  buttonEmoji: {
    fontSize: 28,
    marginBottom: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  scanContainer: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 2,
    borderColor: '#00ffcc',
  },
  scanImage: {
    width: '100%',
    height: '100%',
    opacity: 0.6,
  },
  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#00ffcc',
    shadowColor: '#00ffcc',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 10,
  },
  resultImageSection: {
    alignItems: 'center',
    marginVertical: 10,
    width: '100%',
  },
  resultImage: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    borderRadius: 20,
  },
  retakeButton: {
    marginTop: 15,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  retakeButtonText: {
    color: '#888',
    fontSize: 14,
  },
  loadingSection: {
    marginTop: 10,
    alignItems: 'center',
  },
  loadingText: {
    color: '#00ffcc',
    marginTop: 20,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 1,
  },
  card: {
    backgroundColor: '#111',
    borderRadius: 25,
    padding: 20,
    width: '100%',
    borderWidth: 1,
    borderColor: '#222',
    marginTop: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  foodName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  closeCard: {
    color: '#666',
    fontSize: 20,
    padding: 5,
  },
  insightBox: {
    backgroundColor: '#1a1a1a',
    padding: 15,
    borderRadius: 12,
    marginTop: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#00ffcc',
  },
  insightTitle: {
    color: '#00ffcc',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 5,
    textTransform: 'uppercase',
  },
  insightText: {
    color: '#ddd',
    fontSize: 14,
    lineHeight: 20,
  },
  warningBox: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 15,
  },
  warningTag: {
    backgroundColor: '#ff444420',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ff444440',
  },
  warningText: {
    color: '#ff4444',
    fontSize: 11,
    fontWeight: '600',
  },

  // ========== RECOMMENDATION STYLES ==========
  recommendationSection: {
    width: '100%',
    marginBottom: 25,
  },
  recommendationScroll: {
    paddingLeft: 0,
    gap: 15,
  },
  mealCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 15,
    width: 220,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#333',
  },
  mealImage: {
    width: '100%',
    height: 120,
  },
  mealInfo: {
    padding: 12,
  },
  mealName: {
    color: '#00ffcc',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  mealReason: {
    color: '#888',
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 10,
    height: 32,
  },
  mealMacros: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#222',
    paddingTop: 8,
  },
  mealMacroText: {
    color: '#ccc',
    fontSize: 11,
    fontWeight: '600',
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
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    zIndex: 9999,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: 10,
    borderRadius: 12,
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

  // ========== HISTORY SCREEN STYLES ==========
  historyScreen: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    paddingTop: 50,
  },
  historyList: {
    padding: 20,
    alignItems: 'center',
  },
  historyCard: {
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    padding: 15,
    width: '100%',
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#333',
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  historyFoodName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#00ffcc',
    flex: 1,
  },
  historyDate: {
    fontSize: 12,
    color: '#666',
  },
  historyMacros: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#121212',
    padding: 10,
    borderRadius: 8,
  },
  historyMacroItem: {
    fontSize: 12,
    color: '#ccc',
  },
  emptyHistoryText: {
    color: '#666',
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
    fontStyle: 'italic',
  },
  deleteEntryButton: {
    marginTop: 10,
    alignSelf: 'flex-end',
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  deleteEntryText: {
    color: '#ff4444',
    fontSize: 12,
    fontWeight: '600',
  },
  mainTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '90%',
    marginBottom: 20,
    marginTop: 40,
  },
  historyHeaderButton: {
    backgroundColor: '#1f1f1f',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  historyButtonText: {
    color: '#00ffcc',
    fontSize: 13,
    fontWeight: 'bold',
  },

  // ========== NEW RESULT CARD STYLES ==========
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  iconButton: {
    padding: 5,
  },
  shareIcon: {
    fontSize: 20,
  },
  servingController: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    padding: 15,
    borderRadius: 15,
    marginTop: 15,
    borderWidth: 1,
    borderColor: '#333',
  },
  servingDesc: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#222',
    borderRadius: 10,
    padding: 5,
  },
  stepButton: {
    width: 30,
    height: 30,
    backgroundColor: '#333',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepText: {
    color: '#00ffcc',
    fontSize: 20,
    fontWeight: 'bold',
  },
  quantityText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginHorizontal: 15,
    minWidth: 40,
    textAlign: 'center',
  },
  ingredientSection: {
    marginTop: 20,
    backgroundColor: '#1a1a1a',
    padding: 15,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#333',
  },
  sectionLabel: {
    color: '#888',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
  },
  ingredientTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  ingTag: {
    backgroundColor: '#222',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  ingText: {
    color: '#fff',
    fontSize: 12,
  },
  chefToggle: {
    marginTop: 15,
    backgroundColor: '#00ffcc20',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#00ffcc50',
    alignItems: 'center',
  },
  chefToggleActive: {
    backgroundColor: '#00ffcc',
    borderColor: '#00ffcc',
  },
  chefToggleText: {
    color: '#00ffcc',
    fontWeight: 'bold',
    fontSize: 13,
  },
  recipeBox: {
    marginTop: 15,
    backgroundColor: '#1a1a1a',
    padding: 20,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#333',
  },
  recipeTitle: {
    color: '#00ffcc',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  recipeBullet: {
    color: '#ccc',
    fontSize: 13,
    marginBottom: 4,
    lineHeight: 18,
  },
  recipeStep: {
    color: '#fff',
    fontSize: 13,
    marginBottom: 6,
    lineHeight: 20,
  },

  // ========== MENU X-RAY STYLES ==========
  menuScanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    width: '100%',
    padding: 15,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#333',
    marginBottom: 20,
    gap: 15,
  },
  menuScanEmoji: {
    fontSize: 32,
  },
  menuScanText: {
    color: '#00ffcc',
    fontSize: 16,
    fontWeight: 'bold',
  },
  menuScanSub: {
    color: '#666',
    fontSize: 11,
  },
  menuAnalysisOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#0a0a0a',
    paddingTop: 50,
    zIndex: 1000,
  },
  menuAnalysisList: {
    padding: 20,
  },
  menuHint: {
    color: '#888',
    fontStyle: 'italic',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 20,
  },
  menuItemCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    borderLeftWidth: 5,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  menuItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
    gap: 10,
  },
  menuItemName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    flexWrap: 'wrap',
  },
  trafficLight: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 20,
    minWidth: 60,
    alignItems: 'center',
  },
  trafficText: {
    color: '#000',
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  menuItemReason: {
    color: '#ccc',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  menuItemFooter: {
    borderTopWidth: 1,
    borderTopColor: '#222',
    paddingTop: 10,
    gap: 5,
  },
  menuItemCal: {
    color: '#888',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  menuItemTip: {
    color: '#00ffcc',
    fontSize: 12,
    fontStyle: 'italic',
    lineHeight: 16,
    flexWrap: 'wrap',
  },
});
