-- Add prescriptions table for patient prescription uploads
CREATE TABLE IF NOT EXISTS prescriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  prescription_name VARCHAR(255) NOT NULL,
  prescribed_date DATE NOT NULL,
  doctor_name VARCHAR(255),
  notes TEXT,
  image_url TEXT,
  file_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_prescriptions_patient_id ON prescriptions(patient_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_prescribed_date ON prescriptions(prescribed_date);

-- Enable Row Level Security
ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;

-- Create policy for patients to only access their own prescriptions
CREATE POLICY "Patients can view their own prescriptions" ON prescriptions
  FOR SELECT USING (auth.uid() IN (
    SELECT user_id FROM patients WHERE id = prescriptions.patient_id
  ));

CREATE POLICY "Patients can insert their own prescriptions" ON prescriptions
  FOR INSERT WITH CHECK (auth.uid() IN (
    SELECT user_id FROM patients WHERE id = prescriptions.patient_id
  ));

CREATE POLICY "Patients can update their own prescriptions" ON prescriptions
  FOR UPDATE USING (auth.uid() IN (
    SELECT user_id FROM patients WHERE id = prescriptions.patient_id
  ));

CREATE POLICY "Patients can delete their own prescriptions" ON prescriptions
  FOR DELETE USING (auth.uid() IN (
    SELECT user_id FROM patients WHERE id = prescriptions.patient_id
  ));

-- Create storage bucket for prescription files
INSERT INTO storage.buckets (id, name, public) VALUES ('prescription-files', 'prescription-files', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies
CREATE POLICY "Authenticated users can upload prescription files" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'prescription-files' AND auth.role() = 'authenticated');

CREATE POLICY "Users can view prescription files" ON storage.objects
  FOR SELECT USING (bucket_id = 'prescription-files');

CREATE POLICY "Users can update their own prescription files" ON storage.objects
  FOR UPDATE USING (bucket_id = 'prescription-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own prescription files" ON storage.objects
  FOR DELETE USING (bucket_id = 'prescription-files' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Add patient_notes column to visits table if it doesn't exist
ALTER TABLE visits ADD COLUMN IF NOT EXISTS patient_notes TEXT;

-- Update the visits table to allow patients to edit their own records
CREATE POLICY "Patients can update their own visit notes" ON visits
  FOR UPDATE USING (auth.uid() IN (
    SELECT user_id FROM patients WHERE id = visits.patient_id
  ));

-- Add updated_at trigger for prescriptions
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_prescriptions_updated_at BEFORE UPDATE ON prescriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

