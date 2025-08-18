import React from 'react'
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native'
import { Text, Button } from 'react-native-paper'
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

  const roles = [
    {
      id: 'patient',
      title: 'Patient',
      description: 'View your medical history, track visits, and chat with AI assistant',
      icon: 'person'
    },
    {
      id: 'field_doctor',
      title: 'Field Doctor',
      description: 'Record patient visits, enter vital signs, and manage patient care',
      icon: 'medical-services'
    },
    {
      id: 'admin',
      title: 'Administrator',
      description: 'Manage users, oversee system operations, and view analytics',
      icon: 'admin-panel-settings'
    }
  ]

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <MaterialIcons name="local-hospital" size={48} color="#4285F4" />
          </View>
          <Text style={styles.titleText}>Welcome to DrAi</Text>
          <Text style={styles.subText}>
            Choose your role to get started
          </Text>
        </View>

        <View style={styles.rolesContainer}>
          {roles.map((role) => (
            <TouchableOpacity
              key={role.id}
              style={styles.roleCard}
              onPress={() => handleRoleSelect(role.id)}
              activeOpacity={0.7}
            >
              <View style={styles.roleIcon}>
                <MaterialIcons 
                  name={role.icon as any} 
                  size={32} 
                  color="#4285F4" 
                />
              </View>
              <View style={styles.roleContent}>
                <Text style={styles.roleTitle}>{role.title}</Text>
                <Text style={styles.roleDescription}>{role.description}</Text>
              </View>
              <MaterialIcons 
                name="arrow-forward-ios" 
                size={20} 
                color="#CCCCCC" 
              />
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.divider} />

        <View style={styles.loginSection}>
          <Text style={styles.loginText}>Already have an account?</Text>
          <Button 
            mode="text" 
            onPress={handleLogin} 
            style={styles.loginButton}
            textColor="#4285F4"
          >
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
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F0F7FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  titleText: {
    fontSize: 28,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 8,
  },
  subText: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 24,
  },
  rolesContainer: {
    gap: 16,
    marginBottom: 32,
  },
  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  roleIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F0F7FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  roleContent: {
    flex: 1,
  },
  roleTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 4,
  },
  roleDescription: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
  },
  divider: {
    height: 1,
    backgroundColor: '#E8E8E8',
    marginVertical: 24,
  },
  loginSection: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  loginText: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 8,
  },
  loginButton: {
    marginTop: 4,
  },
})

export default RoleSelectionScreen