import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { FoodMatch } from '../types/food';

type Props = {
  ingredient: string;
  matches: FoodMatch[];
  selectedId: number | null;
  onSelect: (foodId: number | null) => void;
  loading?: boolean;
  error?: string | null;
};

export function FoodDropdown({ ingredient, matches, selectedId, onSelect, loading, error }: Props) {
  const [open, setOpen] = useState(false);
  const selected = matches.find((m) => m.food_id === selectedId) ?? null;

  if (loading) {
    return (
      <View style={[styles.trigger, styles.triggerMuted]}>
        <ActivityIndicator size="small" color="#2e7d32" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.trigger, styles.triggerMuted]}>
        <Text style={styles.errorText} numberOfLines={1}>Fejl</Text>
      </View>
    );
  }

  if (matches.length === 0) {
    return (
      <View style={[styles.trigger, styles.triggerMuted]}>
        <Text style={styles.placeholder} numberOfLines={1}>Ingen match</Text>
      </View>
    );
  }

  function choose(foodId: number | null) {
    onSelect(foodId);
    setOpen(false);
  }

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`Vælg fødevare for ${ingredient}`}
        style={({ pressed }) => [styles.trigger, pressed && styles.triggerPressed]}
      >
        <Text
          style={[styles.triggerText, !selected && styles.placeholder]}
          numberOfLines={2}
        >
          {selected ? selected.food_name : 'Vælg…'}
        </Text>
        <Text style={styles.chevron}>▾</Text>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <Text style={styles.sheetTitle}>{ingredient}</Text>
            <FlatList
              data={matches}
              keyExtractor={(item) => String(item.food_id)}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              renderItem={({ item }) => {
                const isSelected = item.food_id === selectedId;
                return (
                  <Pressable
                    onPress={() => choose(item.food_id)}
                    style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: isSelected }}
                  >
                    <View style={[styles.radio, isSelected && styles.radioSelected]} />
                    <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                      {item.food_name}
                    </Text>
                    <Text style={styles.score}>{Math.round(item.score * 100)}%</Text>
                  </Pressable>
                );
              }}
            />
            <Pressable
              onPress={() => choose(null)}
              style={({ pressed }) => [styles.clear, pressed && styles.optionPressed]}
            >
              <Text style={styles.clearText}>Intet valg</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 40,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#d0d0d0',
    borderRadius: 10,
    backgroundColor: '#fff',
  },
  triggerMuted: {
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
  },
  triggerPressed: {
    backgroundColor: '#f0f7f0',
  },
  triggerText: {
    flex: 1,
    fontSize: 14,
    color: '#222',
  },
  placeholder: {
    color: '#999',
    fontSize: 14,
  },
  errorText: {
    color: '#c62828',
    fontSize: 14,
  },
  chevron: {
    marginLeft: 4,
    color: '#666',
    fontSize: 14,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    padding: 24,
  },
  sheet: {
    maxHeight: '70%',
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 12,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '600',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#e0e0e0',
    marginLeft: 44,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  optionPressed: {
    backgroundColor: '#f2f2f2',
  },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#bbb',
    marginRight: 10,
  },
  radioSelected: {
    borderColor: '#2e7d32',
    backgroundColor: '#2e7d32',
  },
  optionText: {
    flex: 1,
    fontSize: 15,
    color: '#222',
  },
  optionTextSelected: {
    fontWeight: '600',
  },
  score: {
    marginLeft: 8,
    fontSize: 12,
    color: '#888',
  },
  clear: {
    marginTop: 4,
    paddingVertical: 12,
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e0e0e0',
  },
  clearText: {
    color: '#c62828',
    fontSize: 15,
  },
});
