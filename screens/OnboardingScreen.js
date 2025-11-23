import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Dimensions,
  SafeAreaView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "../components/AuthProvider";

const { width } = Dimensions.get("window");

const ONBOARDING_SLIDES = [
  {
    id: "1",
    title: "Willkommen beim\nZwangsgedanken Helfer! 🎉",
    description: "Deine spezialisierte App für den Umgang mit Zwangsgedanken und OCD",
    icon: "heart",
    iconColor: "#FF6B9D",
    gradient: ["#FFE5F0", "#FFFFFF"],
  },
  {
    id: "2",
    title: "Gedanken-Tagebuch\nführen 📝",
    description: "Dokumentiere Zwangsgedanken, deren Intensität und deine Reaktionen. Alles bleibt privat.",
    icon: "create-outline",
    iconColor: "#007AFF",
    gradient: ["#E3F2FD", "#FFFFFF"],
  },
  {
    id: "3",
    title: "KI-Analysen\nerhalten 🤖",
    description: "Erkenne Muster bei deinen Zwangsgedanken und erhalte OCD-spezifische Einblicke.",
    icon: "analytics-outline",
    iconColor: "#34C759",
    gradient: ["#E8F5E9", "#FFFFFF"],
  },
  {
    id: "4",
    title: "Mit OCD-Coach\nchatten 💬",
    description: "Sprich mit dem KI-Coach über Zwangsgedanken. Fokus auf ERP und Unsicherheitstoleranz.",
    icon: "chatbubbles",
    iconColor: "#FF9500",
    gradient: ["#FFF3E0", "#FFFFFF"],
  },
  {
    id: "5",
    title: "SOS-Hilfe\nimmer verfügbar 🆘",
    description: "Zugriff auf OCD-spezifische Strategien und Krisenhotlines - jederzeit verfügbar.",
    icon: "medical",
    iconColor: "#E03131",
    gradient: ["#FFE5E5", "#FFFFFF"],
  },
  {
    id: "6",
    title: "Fortschritte\ntracken 🏆",
    description: "Verfolge deinen Fortschritt im Umgang mit Zwangsgedanken und feiere Erfolge!",
    icon: "trophy",
    iconColor: "#FFB900",
    gradient: ["#FFF9E6", "#FFFFFF"],
  },
];

export default function OnboardingScreen({ navigation }) {
  const { user } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef(null);

  const handleNext = () => {
    if (currentIndex < ONBOARDING_SLIDES.length - 1) {
      const nextIndex = currentIndex + 1;
      flatListRef.current?.scrollToIndex({ index: nextIndex });
      setCurrentIndex(nextIndex);
    } else {
      handleFinish();
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      const prevIndex = currentIndex - 1;
      flatListRef.current?.scrollToIndex({ index: prevIndex });
      setCurrentIndex(prevIndex);
    }
  };

  const handleSkip = () => {
    handleFinish();
  };

  const handleFinish = async () => {
    try {
      if (user) {
        await AsyncStorage.setItem(`hasSeenOnboarding_${user.uid}`, "true");
      }
      navigation.replace("Main");
    } catch (error) {
      console.error("Error finishing onboarding:", error);
    }
  };

  const renderSlide = ({ item }) => (
    <View style={[styles.slide, { width }]}>
      <LinearGradient colors={item.gradient} style={styles.slideGradient}>
        <View style={styles.slideContent}>
          {/* Icon */}
          <View style={[styles.iconContainer, { backgroundColor: item.iconColor + "20" }]}>
            <Ionicons name={item.icon} size={80} color={item.iconColor} />
          </View>

          {/* Title */}
          <Text style={styles.slideTitle}>{item.title}</Text>

          {/* Description */}
          <Text style={styles.slideDescription}>{item.description}</Text>
        </View>
      </LinearGradient>
    </View>
  );

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index || 0);
    }
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  return (
    <SafeAreaView style={styles.container}>
      {/* Skip Button */}
      {currentIndex < ONBOARDING_SLIDES.length - 1 && (
        <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
          <Text style={styles.skipText}>Überspringen</Text>
        </TouchableOpacity>
      )}

      {/* Slides */}
      <FlatList
        ref={flatListRef}
        data={ONBOARDING_SLIDES}
        renderItem={renderSlide}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        scrollEnabled={true}
      />

      {/* Bottom Navigation */}
      <View style={styles.bottomContainer}>
        {/* Pagination Dots */}
        <View style={styles.pagination}>
          {ONBOARDING_SLIDES.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                index === currentIndex ? styles.dotActive : styles.dotInactive,
              ]}
            />
          ))}
        </View>

        {/* Navigation Buttons */}
        <View style={styles.navigationContainer}>
          {currentIndex > 0 && (
            <TouchableOpacity
              style={styles.backButton}
              onPress={handlePrevious}
              activeOpacity={0.8}
            >
              <Ionicons name="arrow-back" size={24} color="#007AFF" />
              <Text style={styles.backText}>Zurück</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[
              styles.nextButton,
              currentIndex === 0 && styles.nextButtonFullWidth,
            ]}
            onPress={handleNext}
            activeOpacity={0.8}
          >
            <Text style={styles.nextText}>
              {currentIndex === ONBOARDING_SLIDES.length - 1
                ? "Los geht's!"
                : "Weiter"}
            </Text>
            <Ionicons name="arrow-forward" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF",
  },
  skipButton: {
    position: "absolute",
    top: 60,
    right: 20,
    zIndex: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#F7F9FC",
    borderRadius: 20,
  },
  skipText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#8E8E93",
  },
  slide: {
    flex: 1,
  },
  slideGradient: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  slideContent: {
    alignItems: "center",
    paddingHorizontal: 40,
  },
  iconContainer: {
    width: 160,
    height: 160,
    borderRadius: 80,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 40,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  slideTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#1C1C1E",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 36,
  },
  slideDescription: {
    fontSize: 16,
    color: "#3C3C43",
    textAlign: "center",
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  bottomContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  pagination: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 30,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  dotActive: {
    width: 24,
    backgroundColor: "#007AFF",
  },
  dotInactive: {
    width: 8,
    backgroundColor: "#C7C7CC",
  },
  navigationContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F7F9FC",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  backText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#007AFF",
  },
  nextButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#007AFF",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
    shadowColor: "#007AFF",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  nextButtonFullWidth: {
    flex: 1,
  },
  nextText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFF",
  },
});
