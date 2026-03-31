import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal } from 'react-native';
import { useAuthStore } from '@/lib/auth';
import { Ionicons } from '@expo/vector-icons';
import { useColorTheme, type ColorThemeName } from '@/lib/theme';
import { useClerk } from '@clerk/clerk-expo';

const themeOptions: { value: ColorThemeName; label: string; color: string }[] = [
  { value: 'default', label: 'Neutral', color: '#171717' },
  { value: 'blue', label: 'Blue', color: '#2563eb' },
  { value: 'green', label: 'Green', color: '#16a34a' },
  { value: 'orange', label: 'Orange', color: '#ea580c' },
  { value: 'rose', label: 'Rose', color: '#e11d48' },
  { value: 'violet', label: 'Violet', color: '#7c3aed' },
];

export default function ProfileScreen() {
  const { user } = useAuthStore();
  const { signOut } = useClerk();
  const { colorTheme, setColorTheme, colors } = useColorTheme();
  const [showThemePicker, setShowThemePicker] = useState(false);

  const handleLogout = async () => {
    await signOut();
  };

  return (
    <ScrollView style={styles.container}>
      {/* Profile Header */}
      <View style={styles.header}>
        <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
          <Text style={styles.avatarText}>
            {user?.firstName?.[0] || user?.username?.[0] || 'U'}
          </Text>
        </View>
        <Text style={styles.name}>
          {user?.firstName} {user?.lastName}
        </Text>
        <Text style={styles.email}>{user?.email}</Text>
      </View>

      {/* Menu Items */}
      <View style={styles.section}>
        <TouchableOpacity style={styles.menuItem}>
          <View style={[styles.menuIcon, { backgroundColor: '#dbeafe' }]}>
            <Ionicons name="person-outline" size={20} color="#2563eb" />
          </View>
          <Text style={styles.menuText}>Edit Profile</Text>
          <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <View style={[styles.menuIcon, { backgroundColor: '#dcfce7' }]}>
            <Ionicons name="notifications-outline" size={20} color="#16a34a" />
          </View>
          <Text style={styles.menuText}>Notification Settings</Text>
          <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => setShowThemePicker(true)}
        >
          <View style={[styles.menuIcon, { backgroundColor: '#f3e8ff' }]}>
            <Ionicons name="color-palette-outline" size={20} color="#7c3aed" />
          </View>
          <Text style={styles.menuText}>Color Theme</Text>
          <View style={styles.menuRight}>
            <View
              style={[
                styles.currentThemeDot,
                { backgroundColor: themeOptions.find((t) => t.value === colorTheme)?.color },
              ]}
            />
            <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <View style={[styles.menuIcon, { backgroundColor: '#fef3c7' }]}>
            <Ionicons name="settings-outline" size={20} color="#d97706" />
          </View>
          <Text style={styles.menuText}>App Settings</Text>
          <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <View style={[styles.menuIcon, { backgroundColor: '#f3e8ff' }]}>
            <Ionicons name="help-circle-outline" size={20} color="#9333ea" />
          </View>
          <Text style={styles.menuText}>Help & Support</Text>
          <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
        </TouchableOpacity>
      </View>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={20} color="#dc2626" />
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>

      {/* Version */}
      <Text style={styles.version}>Nexly v1.0.0</Text>

      {/* Theme Picker Modal */}
      <Modal
        visible={showThemePicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowThemePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Color Theme</Text>
              <TouchableOpacity onPress={() => setShowThemePicker(false)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>
            <View style={styles.themeGrid}>
              {themeOptions.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.themeOption,
                    colorTheme === opt.value && {
                      borderColor: opt.color,
                      backgroundColor: opt.color + '10',
                    },
                  ]}
                  onPress={() => {
                    setColorTheme(opt.value);
                    setShowThemePicker(false);
                  }}
                >
                  <View
                    style={[styles.themeDot, { backgroundColor: opt.color }]}
                  />
                  <Text style={styles.themeLabel}>{opt.label}</Text>
                  {colorTheme === opt.value && (
                    <Ionicons name="checkmark-circle" size={20} color={opt.color} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  name: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: '#64748b',
  },
  section: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuText: {
    flex: 1,
    fontSize: 15,
    color: '#1e293b',
  },
  menuRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  currentThemeDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    margin: 16,
    marginTop: 0,
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#dc2626',
  },
  version: {
    textAlign: 'center',
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 32,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
  },
  themeGrid: {
    gap: 12,
  },
  themeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    gap: 12,
  },
  themeDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  themeLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#1e293b',
  },
});
