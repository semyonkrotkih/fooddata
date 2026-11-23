import { Redirect, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { findFoods } from '../api/foodData';
import { FoodDropdown } from '../components/FoodDropdown';
import { setSelections, useRecipe } from '../store/recipeStore';
import type { FoodMatch, IngredientSelection } from '../types/food';
import type { Ingredient } from '../types/recipe';

type RowState = {
  loading: boolean;
  error: string | null;
  matches: FoodMatch[];
  selectedId: number | null;
};

function formatAmount(item: Ingredient) {
  if (item.amount == null) return item.units ?? '';
  const amount = String(item.amount).replace('.', ',');
  return item.units ? `${amount} ${item.units}` : amount;
}

export default function IngredientsScreen() {
  const recipe = useRecipe();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const ingredients = recipe?.ingridients ?? [];
  const [rows, setRows] = useState<RowState[]>(() =>
    ingredients.map(() => ({ loading: true, error: null, matches: [], selectedId: null })),
  );

  useEffect(() => {
    let cancelled = false;

    ingredients.forEach((item, index) => {
      findFoods(item.ingridient)
        .then((res) => {
          if (cancelled) return;
          // Matches are pre-sorted by the API; pick the best one by default.
          const matches = [...res.matches].sort((a, b) => b.score - a.score);
          updateRow(index, {
            loading: false,
            matches,
            selectedId: matches[0]?.food_id ?? null,
          });
        })
        .catch((e) => {
          if (cancelled) return;
          updateRow(index, {
            loading: false,
            error: e instanceof Error ? e.message : 'Fejl',
          });
        });
    });

    return () => {
      cancelled = true;
    };
    // Run once per recipe.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipe]);

  function updateRow(index: number, patch: Partial<RowState>) {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  if (!recipe) {
    return <Redirect href="/" />;
  }

  const stillLoading = rows.some((r) => r.loading);

  function handleSubmit() {
    const selections: IngredientSelection[] = ingredients.map((item, index) => {
      const row = rows[index];
      const food = row?.matches.find((m) => m.food_id === row.selectedId) ?? null;
      return {
        ingredient: item.ingridient,
        amount: item.amount,
        units: item.units,
        foodId: food?.food_id ?? null,
        foodName: food?.food_name ?? null,
      };
    });
    setSelections(selections);
    router.push('/nutrients');
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={ingredients}
        keyExtractor={(_, index) => String(index)}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <>
            <Text style={styles.title}>{recipe.nameDanish || recipe.name}</Text>
            <View style={styles.headerRow}>
              <Text style={[styles.headerCell, styles.colName]}>Ingrediens</Text>
              <Text style={[styles.headerCell, styles.colFood]}>Fødevare</Text>
              <Text style={[styles.headerCell, styles.colAmount, styles.right]}>Mængde</Text>
            </View>
          </>
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        renderItem={({ item, index }) => {
          const row = rows[index];
          return (
            <View style={styles.row}>
              <Text style={[styles.cell, styles.colName]}>{item.ingridient}</Text>
              <View style={styles.colFood}>
                <FoodDropdown
                  ingredient={item.ingridient}
                  matches={row?.matches ?? []}
                  selectedId={row?.selectedId ?? null}
                  loading={row?.loading}
                  error={row?.error}
                  onSelect={(foodId) => updateRow(index, { selectedId: foodId })}
                />
              </View>
              <Text style={[styles.cell, styles.colAmount, styles.right, styles.amount]}>
                {formatAmount(item)}
              </Text>
            </View>
          );
        }}
      />

      <View style={[styles.footer, { paddingBottom: 12 + insets.bottom }]}>
        <Pressable
          onPress={handleSubmit}
          disabled={stillLoading}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.submit,
            stillLoading && styles.submitDisabled,
            pressed && styles.submitPressed,
          ]}
        >
          <Text style={styles.submitText}>Gem</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 100,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 16,
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
    gap: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerCell: {
    fontSize: 12,
    fontWeight: '600',
    color: '#777',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#e0e0e0',
  },
  cell: {
    fontSize: 15,
    color: '#222',
  },
  colName: {
    flex: 3,
  },
  colFood: {
    flex: 4,
  },
  colAmount: {
    flex: 2,
  },
  right: {
    textAlign: 'right',
  },
  amount: {
    color: '#555',
    fontVariant: ['tabular-nums'],
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  submit: {
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2e7d32',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitPressed: {
    opacity: 0.8,
  },
  submitDisabled: {
    backgroundColor: '#9e9e9e',
  },
  submitText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
