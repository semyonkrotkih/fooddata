import { Redirect } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { getFoodNutrients } from '../api/foodData';
import { useRecipe, useSelections } from '../store/recipeStore';
import type { FoodAmount, IngredientSelection, Nutrient } from '../types/food';

// Convert to grams; anything that isn't a weight (spsk., tsk., stk. ...) becomes 0.
function toGrams(amount: number | null, units: string | null): number {
  if (amount == null || !units) return 0;
  const unit = units.trim().toLowerCase().replace(/\.$/, '');
  if (unit === 'g' || unit === 'gram') return amount;
  if (unit === 'kg' || unit === 'kilo') return amount * 1000;
  return 0;
}

function buildRequest(selections: IngredientSelection[]): FoodAmount[] {
  // Merge duplicates so each food id appears once.
  const totals = new Map<number, number>();
  for (const s of selections) {
    if (s.foodId == null) continue;
    totals.set(s.foodId, (totals.get(s.foodId) ?? 0) + toGrams(s.amount, s.units));
  }
  return [...totals].map(([key, value]) => ({ key, value }));
}

const numberFormat = new Intl.NumberFormat('da-DK', { maximumFractionDigits: 2 });
const formatNumber = (n: number | null | undefined) => (n == null ? '–' : numberFormat.format(n));

export default function NutrientsScreen() {
  const recipe = useRecipe();
  const selections = useSelections();
  const request = useMemo(() => buildRequest(selections), [selections]);
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{
    attempt: number;
    nutrients: Nutrient[];
    error: string | null;
  } | null>(null);

  useEffect(() => {
    if (request.length === 0) return;
    let cancelled = false;
    getFoodNutrients(request)
      .then((data) => {
        if (cancelled) return;
        const nutrients = [...data].sort((a, b) => a.sortKey - b.sortKey);
        setResult({ attempt, nutrients, error: null });
      })
      .catch((e) => {
        if (cancelled) return;
        const error = e instanceof Error ? e.message : 'Noget gik galt';
        setResult({ attempt, nutrients: [], error });
      });
    return () => {
      cancelled = true;
    };
  }, [request, attempt]);

  if (!recipe) {
    return <Redirect href="/" />;
  }

  const loading = request.length > 0 && result?.attempt !== attempt;
  const nutrients = result?.nutrients ?? [];
  const error = loading ? null : (result?.error ?? null);

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#2e7d32" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.error}>{error}</Text>
        <Pressable
          onPress={() => setAttempt((n) => n + 1)}
          style={({ pressed }) => [styles.retry, pressed && styles.retryPressed]}
        >
          <Text style={styles.retryText}>Prøv igen</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={nutrients}
        keyExtractor={(item) => String(item.componentId)}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <>
            <Text style={styles.title}>{recipe.nameDanish || recipe.name}</Text>
            <View style={styles.headerRow}>
              <Text style={[styles.headerCell, styles.colName]}>Næringsstof</Text>
              <Text style={[styles.headerCell, styles.colNum]}>Mængde</Text>
              <Text style={[styles.headerCell, styles.colNum]}>Min</Text>
              <Text style={[styles.headerCell, styles.colNum]}>Median</Text>
              <Text style={[styles.headerCell, styles.colNum]}>Max</Text>
            </View>
          </>
        }
        ListEmptyComponent={
          <Text style={styles.empty}>Ingen næringsstoffer – vælg mindst én fødevare.</Text>
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        renderItem={({ item, index }) => (
          <View style={[styles.row, index % 2 === 1 && styles.rowAlt]}>
            <Text style={[styles.cell, styles.colName]}>{item.name}</Text>
            <Text style={[styles.cell, styles.colNum, styles.value]}>{formatNumber(item.resVal)}</Text>
            <Text style={[styles.cell, styles.colNum]}>{formatNumber(item.min)}</Text>
            <Text style={[styles.cell, styles.colNum]}>{formatNumber(item.median)}</Text>
            <Text style={[styles.cell, styles.colNum]}>{formatNumber(item.max)}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 100,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#222',
    marginTop: 16,
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    gap: 6,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerCell: {
    fontSize: 11,
    fontWeight: '600',
    color: '#777',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  rowAlt: {
    backgroundColor: '#fafafa',
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#e0e0e0',
  },
  cell: {
    fontSize: 14,
    color: '#555',
  },
  colName: {
    flex: 3,
    color: '#222',
  },
  colNum: {
    flex: 2,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
  value: {
    color: '#222',
    fontWeight: '600',
  },
  empty: {
    marginTop: 24,
    textAlign: 'center',
    color: '#777',
  },
  error: {
    color: '#c62828',
    marginBottom: 16,
    textAlign: 'center',
  },
  retry: {
    height: 44,
    paddingHorizontal: 24,
    borderRadius: 22,
    backgroundColor: '#2e7d32',
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryPressed: {
    opacity: 0.8,
  },
  retryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
