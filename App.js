import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image, ActivityIndicator, ScrollView } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

export default function App() {
  const [image, setImage] = useState(null);
  const [base64Data, setBase64Data] = useState(null); // Safely stores raw image text
  const [loading, setLoading] = useState(false);
  const [nutritionData, setNutritionData] = useState(null);

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
      base64: true, // Tells Expo to convert the image to base64 instantly
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
      setBase64Data(result.assets[0].base64); // Capture base64 text stream safely
      setNutritionData(null);
    }
  };

  const analyzeImage = async () => {
    if (!base64Data) {
      alert("Please select a food image first!");
      return;
    }
    setLoading(true);

    try {
      console.log("Sending clean data payload directly to Flask backend...");
      
      let response = await fetch('http://192.168.1.107:5000/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image_data: base64Data // No file systems or local fetch blobs needed!
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Server returned error status: ${response.status}`);
      }

      let data = await response.json();
      console.log("Macros pulled successfully:", data);
      setNutritionData(data);
    } catch (error) {
      alert("Backend connection dropped. Ensure python app_api.py is running!");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>AI Food Analyzer</Text>
      
      <TouchableOpacity style={styles.button} onPress={pickImage}>
        <Text style={styles.buttonText}>📸 Select Food Image</Text>
      </TouchableOpacity>

      {image && <Image source={{ uri: image }} style={styles.image} />}

      {image && !loading && (
        <TouchableOpacity style={[styles.button, styles.analyzeButton]} onPress={analyzeImage}>
          <Text style={styles.buttonText}>Analyze Macros</Text>
        </TouchableOpacity>
      )}

      {loading && <ActivityIndicator size="large" color="#00ffcc" style={{ marginTop: 20 }} />}

      {nutritionData && (
        <View style={styles.card}>
          <Text style={styles.foodName}>{nutritionData.food_name || "Analysis Result"}</Text>
          {nutritionData.description ? (
            <Text style={styles.descriptionText}>"{nutritionData.description}"</Text>
          ) : null}
          <View style={styles.divider} />
          <Text style={styles.macroText}>🔥 Calories: {nutritionData.calories ?? 0} kcal</Text>
          <Text style={styles.macroText}>🥩 Protein: {nutritionData.protein ?? 0}g</Text>
          <Text style={styles.macroText}>🍞 Carbs: {nutritionData.carbs ?? 0}g</Text>
          <Text style={styles.macroText}>🥑 Fats: {nutritionData.fat ?? 0}g</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
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
  analyzeButton: {
    backgroundColor: '#00ffcc',
    borderColor: '#00ffcc',
  },
  buttonText: {
    color: '#121212',
    fontSize: 16,
    fontWeight: 'bold',
  },
  image: {
    width: 250,
    height: 250,
    borderRadius: 15,
    marginVertical: 20,
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
});







