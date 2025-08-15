import React from 'react'
import { View, Text, StyleSheet, ImageBackground, StatusBar } from 'react-native'
import { Button } from 'react-native-paper'
import { MaterialIcons } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native'
import { router } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'

export default function index() {
  const handleSignUp = () => {
    router.push('/auth/role-selection')
  }

  const handleSignIn = () => {
    router.push('/auth/login')
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1976D2" />
      
      <LinearGradient
        colors={['#2196F3', '#1976D2', '#0D47A1']}
        style={styles.gradient}
      >
        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <MaterialIcons name="local-hospital" size={80} color="#FFFFFF" />
            <Text style={styles.companyName}>Viatas</Text>
            <Text style={styles.tagline}>Healthcare at Best</Text>
          </View>
        </View>

        {/* Content Section */}
        <View style={styles.content}>
          <View style={styles.featuresContainer}>
            <View style={styles.feature}>
              <MaterialIcons name="health-and-safety" size={32} color="#E3F2FD" />
              <Text style={styles.featureText}>Quality Healthcare</Text>
            </View>
            
            <View style={styles.feature}>
              <MaterialIcons name="psychology" size={32} color="#E3F2FD" />
              <Text style={styles.featureText}>AI-Powered Insights</Text>
            </View>
            
            <View style={styles.feature}>
              <MaterialIcons name="people" size={32} color="#E3F2FD" />
              <Text style={styles.featureText}>Expert Doctors</Text>
            </View>
          </View>

          <Text style={styles.subtitle}>
            Your trusted partner in healthcare management, connecting patients with professional medical care through innovative technology.
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <Button
            mode="contained"
            onPress={handleSignUp}
            style={styles.signUpButton}
            contentStyle={styles.buttonContent}
            labelStyle={styles.signUpButtonText}
          >
            Get Started
          </Button>

          <Button
            mode="outlined"
            onPress={handleSignIn}
            style={styles.signInButton}
            contentStyle={styles.buttonContent}
            labelStyle={styles.signInButtonText}
          >
            Sign In
          </Button>

          <Text style={styles.footerText}>
            Join thousands of patients and healthcare professionals
          </Text>
        </View>
      </LinearGradient>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
    justifyContent: 'space-between',
  },
  header: {
    flex: 2,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 40,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  companyName: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 16,
    letterSpacing: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  tagline: {
    fontSize: 18,
    color: '#E3F2FD',
    marginTop: 8,
    fontWeight: '300',
    letterSpacing: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 32,
    justifyContent: 'center',
  },
  featuresContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 32,
  },
  feature: {
    alignItems: 'center',
    flex: 1,
  },
  featureText: {
    color: '#E3F2FD',
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
    fontWeight: '500',
  },
  subtitle: {
    fontSize: 16,
    color: '#E3F2FD',
    textAlign: 'center',
    lineHeight: 24,
    fontWeight: '300',
  },
  buttonContainer: {
    paddingHorizontal: 32,
    paddingBottom: 40,
    alignItems: 'center',
  },
  signUpButton: {
    backgroundColor: '#FFFFFF',
    marginBottom: 16,
    width: '100%',
    borderRadius: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  signInButton: {
    borderColor: '#FFFFFF',
    borderWidth: 2,
    width: '100%',
    borderRadius: 12,
    backgroundColor: 'transparent',
  },
  buttonContent: {
    paddingVertical: 12,
  },
  signUpButtonText: {
    color: '#1976D2',
    fontSize: 18,
    fontWeight: 'bold',
  },
  signInButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  footerText: {
    color: '#E3F2FD',
    fontSize: 14,
    marginTop: 24,
    textAlign: 'center',
    fontWeight: '300',
  },
})