// utils/toast.tsx
import React from 'react'
import Toast, { ToastConfig } from 'react-native-toast-message'
import { Text, View } from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'

// Custom toast configuration
export const toastConfig: ToastConfig = {
  success: (props) => {
    return (
      <View style={{
      height: 80,
      width: '90%',
      backgroundColor: '#e6f4e9',
      borderRadius: 12,
      borderLeftColor: '#218838',
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    }}>
      <MaterialIcons name="check-circle" size={24} color="#FFFFFF" />
      <View style={{ marginLeft: 12, flex: 1 }}>
        <Text style={{
          fontSize: 16,
          fontWeight: '600',
          color: '#FFFFFF',
        }}>
          {props.text1}
        </Text>
        {props.text2 && (
          <Text style={{
            fontSize: 14,
            color: '#FFFFFF',
            opacity: 0.9,
            marginTop: 2,
          }}>
            {props.text2}
          </Text>
        )}
      </View>
    </View>
    )
  },
  
  error: (props) => {
    return (
      <View style={{
      height: 80,
      width: '90%',
      backgroundColor: '#fdecea',
      borderLeftColor: '#c82333',
      borderRadius: 12,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    }}>
      <MaterialIcons name="error" size={24} color="#FFFFFF" />
      <View style={{ marginLeft: 12, flex: 1 }}>
        <Text style={{
          fontSize: 16,
          fontWeight: '600',
          color: '#FFFFFF',
        }}>
          {props.text1}
        </Text>
        {props.text2 && (
          <Text style={{
            fontSize: 14,
            color: '#FFFFFF',
            opacity: 0.9,
            marginTop: 2,
          }}>
            {props.text2}
          </Text>
        )}
      </View>
    </View>
    )
  },
  
  info: (props) => {
    return (
      <View style={{
      height: 80,
      width: '90%',
      borderLeftColor: '#0447a8',
      backgroundColor: '#DFF3FF',
      borderRadius: 12,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    }}>
      <MaterialIcons name="info" size={24} color="#FFFFFF" />
      <View style={{ marginLeft: 12, flex: 1 }}>
        <Text style={{
          fontSize: 16,
          fontWeight: '600',
          color: '#FFFFFF',
        }}>
          {props.text1}
        </Text>
        {props.text2 && (
          <Text style={{
            fontSize: 14,
            color: '#FFFFFF',
            opacity: 0.9,
            marginTop: 2,
          }}>
            {props.text2}
          </Text>
        )}
      </View>
    </View>
    )
  },
  
  warning: (props) => {
    return (
      <View style={{
      height: 80,
      width: '90%',
      borderLeftColor: '#e0a800',
      backgroundColor: '#fff7e6',
      borderRadius: 12,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    }}>
      <MaterialIcons name="warning" size={24} color="#FFFFFF" />
      <View style={{ marginLeft: 12, flex: 1 }}>
        <Text style={{
          fontSize: 16,
          fontWeight: '600',
          color: '#FFFFFF',
        }}>
          {props.text1}
        </Text>
        {props.text2 && (
          <Text style={{
            fontSize: 14,
            color: '#FFFFFF',
            opacity: 0.9,
            marginTop: 2,
          }}>
            {props.text2}
          </Text>
        )}
      </View>
    </View>
    )
  },
}

// Toast utility functions
export const showToast = {
  success: (message: string, title: string = 'Success', onHide?: () => void) => {
    Toast.show({
      type: 'success',
      text1: title,
      text2: message,
      position: 'top',
      visibilityTime: 3000,
      autoHide: true,
      topOffset: 60,
      onHide,
    })
  },
  
  error: (message: string, title: string = 'Error', onHide?: () => void) => {
    Toast.show({
      type: 'error',
      text1: title,
      text2: message,
      position: 'top',
      visibilityTime: 4000,
      autoHide: true,
      topOffset: 60,
      onHide,
    })
  },
  
  info: (message: string, title: string = 'Info', onHide?: () => void) => {
    Toast.show({
      type: 'info',
      text1: title,
      text2: message,
      position: 'top',
      visibilityTime: 3000,
      autoHide: true,
      topOffset: 60,
      onHide,
    })
  },
  
  warning: (message: string, title: string = 'Warning', onHide?: () => void) => {
    Toast.show({
      type: 'warning',
      text1: title,
      text2: message,
      position: 'top',
      visibilityTime: 3500,
      autoHide: true,
      topOffset: 60,
      onHide,
    })
  },
  
  // Custom quick methods for common use cases
  validationError: (message: string) => {
    showToast.error(message, 'Validation Error')
  },
  
  networkError: (message: string = 'Please check your internet connection and try again') => {
    showToast.error(message, 'Network Error')
  },
  
  authError: (message: string = 'Authentication failed') => {
    showToast.error(message, 'Authentication Error')
  },
  
  saveSuccess: (itemName: string = 'Data') => {
    showToast.success(`${itemName} saved successfully`)
  },
  
  deleteSuccess: (itemName: string = 'Item') => {
    showToast.success(`${itemName} deleted successfully`)
  },
  
  updateSuccess: (itemName: string = 'Data') => {
    showToast.success(`${itemName} updated successfully`)
  },
  
  comingSoon: () => {
    showToast.info('This feature is coming soon!')
  },
}

// Hide all toasts
export const hideToast = () => {
  Toast.hide()
}