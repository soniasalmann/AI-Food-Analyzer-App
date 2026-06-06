import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

const Ring = ({ size, strokeWidth, progress, color, label, value }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <View style={styles.ringContainer}>
      <Svg width={size} height={size}>
        {/* Background Circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#222"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress Circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="none"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={StyleSheet.absoluteFillObject, styles.labelOverlay}>
        <Text style={[styles.valueText, { color }]}>{value}</Text>
        <Text style={styles.labelText}>{label}</Text>
      </View>
    </View>
  );
};

export const HealthRings = ({ data, targets = { calories: 2000, protein: 150, carbs: 250, fat: 70 } }) => {
  if (!data) return null;

  const calProgress = Math.min((data.calories / targets.calories) * 100, 100);
  const proProgress = Math.min((data.protein / targets.protein) * 100, 100);
  const carbProgress = Math.min((data.carbs / targets.carbs) * 100, 100);
  const fatProgress = Math.min((data.fat / targets.fat) * 100, 100);

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Ring size={100} strokeWidth={10} progress={calProgress} color="#ff4444" label="kcal" value={data.calories} />
        <Ring size={100} strokeWidth={10} progress={proProgress} color="#00ffcc" label="protein" value={`${data.protein}g`} />
      </View>
      <View style={styles.row}>
        <Ring size={100} strokeWidth={10} progress={carbProgress} color="#00ccff" label="carbs" value={`${data.carbs}g`} />
        <Ring size={100} strokeWidth={10} progress={fatProgress} color="#ffcc00" label="fats" value={`${data.fat}g`} />
      </View>
      
      {data.health_score !== undefined && (
        <View style={styles.scoreBox}>
          <Text style={styles.scoreLabel}>Health Score</Text>
          <View style={styles.scoreRow}>
            <Text style={[styles.scoreValue, { color: getGradeColor(data.health_grade) }]}>
              {data.health_score}
            </Text>
            <Text style={[styles.gradeValue, { color: getGradeColor(data.health_grade) }]}>
              {data.health_grade}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
};

const getGradeColor = (grade) => {
  if (!grade) return '#fff';
  if (grade.startsWith('A')) return '#00ffcc';
  if (grade.startsWith('B')) return '#aaff00';
  if (grade.startsWith('C')) return '#ffcc00';
  if (grade.startsWith('D')) return '#ff8800';
  return '#ff4444';
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    alignItems: 'center',
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 20,
  },
  ringContainer: {
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  labelOverlay: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    width: 100,
    height: 100,
    top: 0,
    left: 0,
  },
  valueText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  labelText: {
    fontSize: 10,
    color: '#666',
    textTransform: 'uppercase',
  },
  scoreBox: {
    backgroundColor: '#1a1a1a',
    borderRadius: 15,
    padding: 15,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  scoreLabel: {
    color: '#888',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 5,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
  },
  scoreValue: {
    fontSize: 48,
    fontWeight: 'bold',
  },
  gradeValue: {
    fontSize: 24,
    fontWeight: '800',
  },
});
