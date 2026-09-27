import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { FlatList, StyleSheet, View } from "react-native";
import {
  Button,
  List,
  Modal,
  Portal,
  Searchbar,
  Text,
} from "react-native-paper";

import { useDistricts } from "@/features/onboarding/api";
import { useAppStore } from "@/stores/useAppStore";

type DistrictPickerProps = {
  value: number | null;
  onChange: (districtId: number) => void;
  label: string;
  error?: boolean;
};

export function DistrictPicker({
  value,
  onChange,
  label,
  error,
}: DistrictPickerProps) {
  const { t } = useTranslation();
  const language = useAppStore((state) => state.language);
  const districtsQuery = useDistricts();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const nameField = language === "bn" ? "name_bn" : "name_en";

  const selected = districtsQuery.data?.find((d) => d.id === value);

  const filtered = useMemo(() => {
    const list = districtsQuery.data ?? [];
    if (!query.trim()) return list;
    const q = query.trim().toLowerCase();
    return list.filter(
      (d) =>
        d.name_bn.toLowerCase().includes(q) ||
        d.name_en.toLowerCase().includes(q),
    );
  }, [districtsQuery.data, query]);

  return (
    <View>
      <Button
        mode="outlined"
        onPress={() => setOpen(true)}
        contentStyle={styles.buttonContent}
        style={error ? styles.buttonError : undefined}
      >
        {selected ? selected[nameField] : label}
      </Button>

      <Portal>
        <Modal
          visible={open}
          onDismiss={() => setOpen(false)}
          contentContainerStyle={styles.modal}
        >
          <Searchbar
            placeholder={t("common.search")}
            value={query}
            onChangeText={setQuery}
            style={styles.searchbar}
          />
          <FlatList
            data={filtered}
            keyExtractor={(item) => String(item.id)}
            style={styles.list}
            renderItem={({ item }) => (
              <List.Item
                title={item[nameField]}
                onPress={() => {
                  onChange(item.id);
                  setOpen(false);
                  setQuery("");
                }}
              />
            )}
            ListEmptyComponent={
              <Text style={styles.empty}>{t("common.noResults")}</Text>
            }
          />
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  buttonContent: {
    minHeight: 48,
    justifyContent: "flex-start",
  },
  buttonError: {
    borderColor: "#B3261E",
  },
  modal: {
    backgroundColor: "white",
    margin: 24,
    borderRadius: 8,
    maxHeight: "80%",
    padding: 8,
  },
  searchbar: {
    marginBottom: 8,
  },
  list: {
    flexGrow: 0,
  },
  empty: {
    textAlign: "center",
    padding: 16,
  },
});
