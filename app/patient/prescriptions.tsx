import React, { useState, useEffect } from 'react'
import { View, StyleSheet, ScrollView, RefreshControl, Alert, Image } from 'react-native'
import { Card, Text, Button, TextInput, ActivityIndicator, FAB, Chip } from 'react-native-paper'
import { MaterialIcons } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import * as DocumentPicker from 'expo-document-picker'
import { useAuth } from '../../contexts/AuthContext'
import { supabase, Patient } from '../../lib/supabase'
import EmptyState from '~/components/EmptyState'


interface Prescription {
  id: string
  patient_id: string
  prescription_name: string
  prescribed_date: string
  doctor_name?: string
  notes?: string
  image_url?: string
  file_url?: string
  created_at: string
}

const PrescriptionsScreen: React.FC = () => {
  const { userProfile } = useAuth()
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [uploading, setUploading] = useState(false)

  // Form fields
  const [prescriptionName, setPrescriptionName] = useState('')
  const [prescribedDate, setPrescribedDate] = useState('')
  const [doctorName, setDoctorName] = useState('')
  const [notes, setNotes] = useState('')
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<any>(null)

  const patient = userProfile as Patient

  useEffect(() => {
    loadPrescriptions()
  }, [])

  const loadPrescriptions = async () => {
    if (!patient) return

    try {
      const { data, error } = await supabase
        .from('prescriptions')
        .select('*')
        .eq('patient_id', patient.id)
        .order('prescribed_date', { ascending: false })

      if (error) {
        console.error('Error loading prescriptions:', error)
      } else {
        setPrescriptions(data || [])
      }
    } catch (error) {
      console.error('Error loading prescriptions:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const onRefresh = () => {
    setRefreshing(true)
    loadPrescriptions()
  }

  const resetForm = () => {
    setPrescriptionName('')
    setPrescribedDate('')
    setDoctorName('')
    setNotes('')
    setSelectedImage(null)
    setSelectedFile(null)
    setShowAddForm(false)
  }

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant camera roll permissions to upload images.')
      return
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    })

    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].uri)
      setSelectedFile(null) // Clear file if image is selected
    }
  }

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      })

      if (!result.canceled && result.assets[0]) {
        setSelectedFile(result.assets[0])
        setSelectedImage(null) // Clear image if file is selected
      }
    } catch (error) {
      console.error('Error picking document:', error)
      Alert.alert('Error', 'Failed to pick document')
    }
  }

  const uploadFile = async (uri: string, fileName: string): Promise<string | null> => {
    try {
      const response = await fetch(uri)
      const blob = await response.blob()
      
      const fileExt = fileName.split('.').pop()
      const filePath = `prescriptions/${patient.id}/${Date.now()}.${fileExt}`

      const { data, error } = await supabase.storage
        .from('prescription-files')
        .upload(filePath, blob)

      if (error) {
        console.error('Upload error:', error)
        return null
      }

      const { data: urlData } = supabase.storage
        .from('prescription-files')
        .getPublicUrl(data.path)

      return urlData.publicUrl
    } catch (error) {
      console.error('Upload error:', error)
      return null
    }
  }

  const handleSave = async () => {
    if (!prescriptionName.trim() || !prescribedDate.trim()) {
      Alert.alert('Validation Error', 'Please enter prescription name and date')
      return
    }

    setUploading(true)
    try {
      let imageUrl = null
      let fileUrl = null

      // Upload image if selected
      if (selectedImage) {
        imageUrl = await uploadFile(selectedImage, 'prescription_image.jpg')
        if (!imageUrl) {
          Alert.alert('Error', 'Failed to upload image')
          setUploading(false)
          return
        }
      }

      // Upload file if selected
      if (selectedFile) {
        fileUrl = await uploadFile(selectedFile.uri, selectedFile.name)
        if (!fileUrl) {
          Alert.alert('Error', 'Failed to upload file')
          setUploading(false)
          return
        }
      }

      // Save prescription data
      const prescriptionData = {
        patient_id: patient.id,
        prescription_name: prescriptionName.trim(),
        prescribed_date: prescribedDate.trim(),
        doctor_name: doctorName.trim() || null,
        notes: notes.trim() || null,
        image_url: imageUrl,
        file_url: fileUrl,
      }

      const { error } = await supabase
        .from('prescriptions')
        .insert(prescriptionData)

      if (error) {
        Alert.alert('Error', 'Failed to save prescription')
        console.error('Error saving prescription:', error)
      } else {
        Alert.alert('Success', 'Prescription saved successfully')
        resetForm()
        loadPrescriptions()
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred')
      console.error('Error saving prescription:', error)
    } finally {
      setUploading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const deletePrescription = async (id: string) => {
    Alert.alert(
      'Delete Prescription',
      'Are you sure you want to delete this prescription?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('prescriptions')
                .delete()
                .eq('id', id)

              if (error) {
                Alert.alert('Error', 'Failed to delete prescription')
                console.error('Error deleting prescription:', error)
              } else {
                loadPrescriptions()
              }
            } catch (error) {
              Alert.alert('Error', 'An unexpected error occurred')
              console.error('Error deleting prescription:', error)
            }
          }
        }
      ]
    )
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
          <Text style={styles.loadingText}>Loading prescriptions...</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.headerSection}>
          <Text style={styles.headerTitle}>My Prescriptions</Text>
          <Text style={styles.headerSubtitle}>
            Upload and manage your prescription records
          </Text>
        </View>

        {/* Add Prescription Form */}
        {showAddForm && (
          <Card style={styles.formCard}>
            <Card.Content>
              <View style={styles.formHeader}>
                <MaterialIcons name="add-circle" size={24} color="#2196F3" />
                <Text style={styles.formTitle}>Add New Prescription</Text>
              </View>

              <TextInput
                label="Prescription Name *"
                value={prescriptionName}
                onChangeText={setPrescriptionName}
                mode="outlined"
                style={styles.input}
                placeholder="e.g., Amoxicillin 500mg"
              />

              <TextInput
                label="Prescribed Date *"
                value={prescribedDate}
                onChangeText={setPrescribedDate}
                mode="outlined"
                style={styles.input}
                placeholder="YYYY-MM-DD"
              />

              <TextInput
                label="Doctor Name"
                value={doctorName}
                onChangeText={setDoctorName}
                mode="outlined"
                style={styles.input}
                placeholder="Dr. Smith"
              />

              <TextInput
                label="Notes"
                value={notes}
                onChangeText={setNotes}
                mode="outlined"
                style={styles.input}
                multiline
                numberOfLines={3}
                placeholder="Additional notes about this prescription..."
              />

              {/* File Upload Section */}
              <View style={styles.uploadSection}>
                <Text style={styles.uploadTitle}>Attach Prescription</Text>
                <View style={styles.uploadButtons}>
                  <Button
                    mode="outlined"
                    onPress={pickImage}
                    style={styles.uploadButton}
                    icon="camera"
                  >
                    Photo
                  </Button>
                  <Button
                    mode="outlined"
                    onPress={pickDocument}
                    style={styles.uploadButton}
                    icon="file-document"
                  >
                    Document
                  </Button>
                </View>

                {selectedImage && (
                  <View style={styles.previewContainer}>
                    <Text style={styles.previewLabel}>Selected Image:</Text>
                    <Image source={{ uri: selectedImage }} style={styles.imagePreview} />
                  </View>
                )}

                {selectedFile && (
                  <View style={styles.previewContainer}>
                    <Text style={styles.previewLabel}>Selected File:</Text>
                    <Chip mode="outlined" icon="file-document">
                      {selectedFile.name}
                    </Chip>
                  </View>
                )}
              </View>

              {/* Form Actions */}
              <View style={styles.formActions}>
                <Button
                  mode="contained"
                  onPress={handleSave}
                  loading={uploading}
                  disabled={uploading}
                  style={styles.saveButton}
                >
                  Save Prescription
                </Button>
                <Button
                  mode="outlined"
                  onPress={resetForm}
                  disabled={uploading}
                  style={styles.cancelButton}
                >
                  Cancel
                </Button>
              </View>
            </Card.Content>
          </Card>
        )}

        {/* Prescriptions List */}
        {prescriptions.length > 0 ? (
          prescriptions.map((prescription) => (
            <Card key={prescription.id} style={styles.prescriptionCard}>
              <Card.Content>
                <View style={styles.prescriptionHeader}>
                  <View style={styles.prescriptionInfo}>
                    <Text style={styles.prescriptionName}>
                      {prescription.prescription_name}
                    </Text>
                    <Text style={styles.prescriptionDate}>
                      Prescribed: {formatDate(prescription.prescribed_date)}
                    </Text>
                    {prescription.doctor_name && (
                      <Text style={styles.doctorName}>
                        Dr. {prescription.doctor_name}
                      </Text>
                    )}
                  </View>
                  <Button
                    mode="text"
                    onPress={() => deletePrescription(prescription.id)}
                    textColor="#f44336"
                    compact
                  >
                    Delete
                  </Button>
                </View>

                {prescription.notes && (
                  <View style={styles.notesSection}>
                    <Text style={styles.notesLabel}>Notes:</Text>
                    <Text style={styles.notesText}>{prescription.notes}</Text>
                  </View>
                )}

                {/* Attachments */}
                <View style={styles.attachmentsSection}>
                  {prescription.image_url && (
                    <View style={styles.attachmentItem}>
                      <MaterialIcons name="image" size={16} color="#2196F3" />
                      <Text style={styles.attachmentText}>Image attached</Text>
                    </View>
                  )}
                  {prescription.file_url && (
                    <View style={styles.attachmentItem}>
                      <MaterialIcons name="file-document" size={16} color="#2196F3" />
                      <Text style={styles.attachmentText}>Document attached</Text>
                    </View>
                  )}
                </View>

                <Text style={styles.uploadedDate}>
                  Uploaded: {formatDate(prescription.created_at)}
                </Text>
              </Card.Content>
            </Card>
          ))
        ) : !showAddForm ? (
          <EmptyState
            icon="medication"
            title="No prescriptions yet"
            description="Upload your prescription records to keep track of your medications and medical history."
            actionText="Add First Prescription"
            onAction={() => setShowAddForm(true)}
          />
        ) : null}
      </ScrollView>

      {/* Floating Action Button */}
      {!showAddForm && (
        <FAB
          style={styles.fab}
          icon="plus"
          onPress={() => setShowAddForm(true)}
          label="Add Prescription"
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100, // Space for FAB
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: '#666',
    fontSize: 16,
  },
  headerSection: {
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666',
  },
  formCard: {
    marginBottom: 24,
    elevation: 3,
    backgroundColor: '#ffffff',
  },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 12,
    color: '#333',
  },
  input: {
    marginBottom: 16,
    backgroundColor: '#ffffff',
  },
  uploadSection: {
    marginBottom: 20,
  },
  uploadTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  uploadButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  uploadButton: {
    flex: 1,
  },
  previewContainer: {
    marginTop: 12,
  },
  previewLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
    color: '#666',
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    resizeMode: 'cover',
  },
  formActions: {
    gap: 12,
  },
  saveButton: {
    backgroundColor: '#2196F3',
  },
  cancelButton: {
    borderColor: '#666',
  },
  prescriptionCard: {
    marginBottom: 16,
    elevation: 2,
    backgroundColor: '#ffffff',
  },
  prescriptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  prescriptionInfo: {
    flex: 1,
  },
  prescriptionName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  prescriptionDate: {
    color: '#666',
    marginBottom: 4,
  },
  doctorName: {
    color: '#2196F3',
    fontWeight: '500',
  },
  notesSection: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  notesLabel: {
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#333',
  },
  notesText: {
    color: '#666',
    lineHeight: 20,
  },
  attachmentsSection: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 8,
  },
  attachmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  attachmentText: {
    marginLeft: 6,
    color: '#2196F3',
    fontSize: 14,
  },
  uploadedDate: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#2196F3',
  },
})

export default PrescriptionsScreen

