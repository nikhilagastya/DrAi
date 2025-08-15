import React from 'react'
import { View, StyleSheet, ScrollView } from 'react-native'
import { Card, Text, Button } from 'react-native-paper'
import { MaterialIcons } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native'
import { router } from 'expo-router'

const RoleSelectionScreen: React.FC = () => {
  

  const handleRoleSelect = (role: string) => {
    router.push(`/auth/signup?role=${role}`)
  }

  const handleLogin = () => {
    router.push('/auth/login')
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <MaterialIcons name="local-hospital" size={64} color="#2196F3" />
          <Text style={styles.titleText}>Healthcare App</Text>
          <Text style={styles.subText}>
            Choose your role to get started
          </Text>
        </View>

        <View style={styles.rolesContainer}>
          <Card style={styles.roleCard} onPress={() => handleRoleSelect('patient')}>
            <Card.Content style={styles.cardContent}>
              <MaterialIcons name="person" size={48} color="#2196F3" />
              <Text style={styles.roleText}>Patient</Text>
              <Text style={styles.roleDescription}>
                View your medical history, track visits, and chat with AI assistant
              </Text>
            </Card.Content>
          </Card>

          <Card style={styles.roleCard} onPress={() => handleRoleSelect('field_doctor')}>
            <Card.Content style={styles.cardContent}>
              <MaterialIcons name="medical-services" size={48} color="#4CAF50" />
              <Text style={styles.roleText}>Field Doctor</Text>
              <Text style={styles.roleDescription}>
                Record patient visits, enter vital signs, and manage patient care
              </Text>
            </Card.Content>
          </Card>

          <Card style={styles.roleCard} onPress={() => handleRoleSelect('admin')}>
            <Card.Content style={styles.cardContent}>
              <MaterialIcons name="admin-panel-settings" size={48} color="#FF9800" />
              <Text style={styles.roleText}>Administrator</Text>
              <Text style={styles.roleDescription}>
                Manage users, oversee system operations, and view analytics
              </Text>
            </Card.Content>
          </Card>
        </View>

        <View style={styles.loginSection}>
          <Text style={styles.loginText}>Already have an account?</Text>
          <Button mode="outlined" onPress={handleLogin} style={styles.loginButton}>
            Sign In
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
    marginTop: 20,
  },
  titleText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
  },
  subText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },
  rolesContainer: {
    flex: 1,
    gap: 16,
  },
  roleCard: {
    elevation: 4,
    backgroundColor: '#fff',
  },
  cardContent: {
    alignItems: 'center',
    padding: 24,
  },
  roleText: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 12,
    marginBottom: 8,
  },
  roleDescription: {
    textAlign: 'center',
    color: '#666',
    lineHeight: 20,
  },
  loginSection: {
    alignItems: 'center',
    marginTop: 32,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  loginText: {
    color: '#666',
    marginBottom: 12,
  },
  loginButton: {
    minWidth: 120,
  },
})

export default RoleSelectionScreen

