import React from 'react'
import { View, StyleSheet, KeyboardTypeOptions, TextInputProps } from 'react-native'
import { TextInput, Text } from 'react-native-paper'

interface CleanTextInputProps {
    label: string
    value: string
    onChangeText: (text: string) => void
    secureTextEntry?: boolean
    keyboardType?: KeyboardTypeOptions
    placeholder?: string
    multiline?: boolean
    numberOfLines?: number
    autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters'
    autoComplete?: TextInputProps['autoComplete']
    left?: React.ReactNode
    right?: React.ReactNode
    style?: any
    [key: string]: any // For any additional props
  }
  

const CleanTextInput: React.FC<CleanTextInputProps> = ({ 
  label, 
  value, 
  onChangeText, 
  secureTextEntry, 
  keyboardType, 
  placeholder, 
  multiline,
  numberOfLines,
  style,
  ...props 
}) => (
  <View style={styles.inputContainer}>
    <Text style={styles.inputLabel}>{label}</Text>
    <TextInput
      value={value}
      onChangeText={onChangeText}
      secureTextEntry={secureTextEntry}
      keyboardType={keyboardType}
      placeholder={placeholder}
      multiline={multiline}
      numberOfLines={numberOfLines}
      mode="outlined"
      style={[styles.input, multiline && styles.multilineInput, style]}
      outlineStyle={styles.inputOutline}
      contentStyle={styles.inputContent}
      theme={{
        colors: {
          primary: '#4285F4',
          outline: '#E8E8E8',
          background: '#FAFAFA',
          onSurfaceVariant: '#999999',
        }
      }}
      {...props}
    />
  </View>
)

const styles = StyleSheet.create({
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FAFAFA',
    fontSize: 16,
  },
  multilineInput: {
    paddingTop: 12,
  },
  inputContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  inputOutline: {
    borderColor: '#E8E8E8',
    borderWidth: 1,
    borderRadius: 8,
  },
})

export default CleanTextInput