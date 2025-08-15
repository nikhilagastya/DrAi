## New Folder Structure Plan

```
screens/
├── _layout.tsx (Root layout for expo-router)
├── auth/
│   ├── _layout.tsx (Auth specific layout)
│   ├── index.tsx (Redirect to RoleSelection or Login)
│   ├── login.tsx
│   ├── signup.tsx
│   └── role-selection.tsx
├── patient/
│   ├── _layout.tsx (Patient specific layout)
│   ├── index.tsx (Patient Home)
│   ├── history.tsx
│   ├── chat.tsx
│   └── profile.tsx
├── doctor/
│   ├── _layout.tsx (Doctor specific layout)
│   ├── index.tsx (Doctor Home)
│   ├── patient-search.tsx
│   ├── visit-form.tsx
│   ├── profile.tsx
│   └── ai-chat-room.tsx (New AI chat screen)
├── admin/
│   ├── _layout.tsx (Admin specific layout)
│   ├── index.tsx (Admin Home)
│   ├── patients.tsx
│   ├── doctors.tsx
│   └── profile.tsx
└── loading.tsx (Loading screen)
```

**Migration Plan:**

1.  **`App.tsx`**: Will be simplified to only include `PaperProvider` and `AuthProvider`. `AppNavigator` will be removed.
2.  **`navigation/AppNavigator.tsx`**: This file will be completely removed as `expo-router` will handle navigation.
3.  **`screens/auth/`**: 
    - `LoginScreen.tsx` -> `screens/auth/login.tsx`
    - `SignUpScreen.tsx` -> `screens/auth/signup.tsx`
    - `RoleSelectionScreen.tsx` -> `screens/auth/role-selection.tsx`
    - A new `screens/auth/index.tsx` will be created to handle initial auth routing.
4.  **`screens/patient/`**: 
    - `PatientHomeScreen.tsx` -> `screens/patient/index.tsx`
    - `PatientHistoryScreen.tsx` -> `screens/patient/history.tsx`
    - `PatientChatScreen.tsx` -> `screens/patient/chat.tsx`
    - `PatientProfileScreen.tsx` -> `screens/patient/profile.tsx`
5.  **`screens/doctor/`**: 
    - `DoctorHomeScreen.tsx` -> `screens/doctor/index.tsx`
    - `PatientSearchScreen.tsx` -> `screens/doctor/patient-search.tsx`
    - `VisitFormScreen.tsx` -> `screens/doctor/visit-form.tsx`
    - `DoctorProfileScreen.tsx` -> `screens/doctor/profile.tsx`
    - A new `screens/doctor/ai-chat-room.tsx` will be created.
6.  **`screens/admin/`**: 
    - `AdminHomeScreen.tsx` -> `screens/admin/index.tsx`
    - `AdminPatientsScreen.tsx` -> `screens/admin/patients.tsx`
    - `AdminDoctorsScreen.tsx` -> `screens/admin/doctors.tsx`
    - `AdminProfileScreen.tsx` -> `screens/admin/profile.tsx`
7.  **`screens/LoadingScreen.tsx`**: Will be moved to `screens/loading.tsx`.

This structure will allow for nested layouts and clear separation of concerns for each user role.

