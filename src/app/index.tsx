import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { readRecipe } from '../api/recipe';
import { setRecipe } from '../store/recipeStore';

export default function SearchScreen() {
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSearch = url.trim().length > 0 && !loading;

  async function handleSearch() {
    if (!canSearch) return;
    setLoading(true);
    setError(null);
    try {
      const result = await readRecipe(url.trim());
      setRecipe(result);
      router.push('/ingredients');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Noget gik galt');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.row}>
        <TextInput
          style={styles.input}
          value={url}
          onChangeText={setUrl}
          placeholder="Indsæt opskrift-URL"
          autoFocus
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          inputMode="url"
          returnKeyType="search"
          onSubmitEditing={handleSearch}
          editable={!loading}
        />
      </View>

      
      <View style={[styles.footer, { paddingBottom: 0 }]}>
        <Pressable
            onPress={handleSearch}
            disabled={!canSearch}
            accessibilityRole="button"
            accessibilityLabel="Søg"
            style={({ pressed }) => [
              styles.button,
              !canSearch && styles.buttonDisabled,
              pressed && styles.buttonPressed,
            ]}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Søg</Text>
            )}
          </Pressable>
      </View>

      {error && <Text style={styles.error}>{error}</Text>}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    maxWidth: 600,
    gap: 8,
    height: "80%",
  },
  input: {
    flex: 1,
    height: 48,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 24,
    fontSize: 16,
    backgroundColor: '#fafafa',
  },
  button: {
    height: 48,
    width: '100%',
    paddingHorizontal: 20,
    borderRadius: 24,
    backgroundColor: '#2e7d32',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonDisabled: {
    backgroundColor: '#9e9e9e',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  error: {
    marginTop: 16,
    color: '#c62828',
  },
  footer: {
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#fff',
    position: 'static',
    bottom: 0,
    left: 0,
    width: '100%',
  },
});
