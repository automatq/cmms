import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { signIn } from '@/lib/auth-client';

export default function SignInScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignIn() {
    setError(null);
    setSubmitting(true);
    try {
      const res = await signIn.email({ email, password });
      if (res.error) {
        setError(res.error.message || 'Invalid email or password');
      }
      // On success, AuthGate in _layout.tsx redirects to /(tabs)
    } catch (err: any) {
      setError(err?.message || 'Sign in failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Ionicons name="construct" size={48} color="#fff" />
        </View>
        <Text style={styles.title}>MainTek</Text>
        <Text style={styles.subtitle}>Maintenance Management</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.description}>
          Sign in to manage work orders, track assets, and complete maintenance tasks.
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Email"
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          value={email}
          onChangeText={setEmail}
          editable={!submitting}
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          secureTextEntry
          autoComplete="current-password"
          value={password}
          onChangeText={setPassword}
          editable={!submitting}
        />

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.button, (submitting || !email || !password) && styles.buttonDisabled]}
          onPress={handleSignIn}
          disabled={submitting || !email || !password}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="log-in-outline" size={24} color="#fff" />
              <Text style={styles.buttonText}>Sign In</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.helper}>
          Don't have an account? Ask your admin for an invitation.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    backgroundColor: '#2563eb',
    paddingTop: 100,
    paddingBottom: 60,
    alignItems: 'center',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: { fontSize: 32, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
  subtitle: { fontSize: 16, color: 'rgba(255,255,255,0.8)' },
  content: { flex: 1, padding: 24, justifyContent: 'center' },
  description: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    marginBottom: 12,
  },
  errorText: { color: '#dc2626', textAlign: 'center', marginBottom: 12 },
  button: {
    backgroundColor: '#2563eb',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  helper: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 24,
  },
});
