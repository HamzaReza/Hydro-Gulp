import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useEffect, useState } from "react";
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useDispatch, useSelector } from "react-redux";
import {
  DEFAULT_QUICK_ADD_AMOUNTS,
  PRESET_COUNT_MAX,
  PRESET_MAX,
  PRESET_MIN,
} from "../../constants/drinks";
import { BorderRadius, FontFamily, FontSize } from "../../constants/theme";
import { useTheme } from "../../hooks/useTheme";
import { AppDispatch, RootState } from "../../store";
import { setProfile, updateProfileThunk } from "../../store/slices/profileSlice";
import { mlToOz, ozToMl } from "../../utils/dateUtils";
import { BottomSheet } from "./BottomSheet";
import { GradientButton } from "./GradientButton";

interface PresetEditorSheetProps {
  visible: boolean;
  onClose: () => void;
}

export const PresetEditorSheet: React.FC<PresetEditorSheetProps> = ({
  visible,
  onClose,
}) => {
  const theme = useTheme();
  const dispatch = useDispatch<AppDispatch>();
  const uid = useSelector((state: RootState) => state.auth.uid);
  const unit = useSelector((state: RootState) => state.profile.unit);
  // Fallback covers state persisted before quickAddPresets existed
  const savedPresets =
    useSelector((state: RootState) => state.profile.quickAddPresets) ??
    DEFAULT_QUICK_ADD_AMOUNTS;

  const [presets, setPresets] = useState<number[]>(savedPresets);
  const [newAmount, setNewAmount] = useState("");

  // Re-seed the local draft each time the sheet opens
  useEffect(() => {
    if (visible) {
      setPresets(savedPresets);
      setNewAmount("");
    }
  }, [visible, savedPresets]);

  const displayAmount = (ml: number) =>
    unit === "oz" ? `${mlToOz(ml)} oz` : `${ml} ml`;

  const handleAdd = () => {
    const parsed = parseFloat(newAmount);
    if (!newAmount.trim() || isNaN(parsed) || parsed <= 0) {
      Alert.alert("Invalid amount", "Please enter a valid amount.");
      return;
    }
    // Store everything in ml — convert oz input, require whole ml
    const ml = unit === "oz" ? ozToMl(parsed) : parsed;
    if (!Number.isInteger(ml)) {
      Alert.alert("Invalid amount", "Please enter a whole number of ml.");
      return;
    }
    if (ml < PRESET_MIN || ml > PRESET_MAX) {
      Alert.alert(
        "Invalid amount",
        unit === "oz"
          ? `Please enter an amount between ${mlToOz(PRESET_MIN)} and ${mlToOz(PRESET_MAX)} oz.`
          : `Please enter an amount between ${PRESET_MIN} and ${PRESET_MAX} ml.`,
      );
      return;
    }
    if (presets.includes(ml)) {
      Alert.alert("Duplicate preset", `${displayAmount(ml)} is already in your presets.`);
      return;
    }
    if (presets.length >= PRESET_COUNT_MAX) {
      Alert.alert(
        "Preset limit reached",
        `You can have up to ${PRESET_COUNT_MAX} presets. Remove one first.`,
      );
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPresets((prev) => [...prev, ml]);
    setNewAmount("");
  };

  const handleDelete = (ml: number) => {
    if (presets.length <= 1) {
      Alert.alert("Cannot remove", "You need at least one quick-add preset.");
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPresets((prev) => prev.filter((p) => p !== ml));
  };

  const handleReset = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPresets(DEFAULT_QUICK_ADD_AMOUNTS);
  };

  const handleSave = () => {
    const sorted = [...presets].sort((a, b) => a - b);
    // Optimistic local update, then persist
    dispatch(setProfile({ quickAddPresets: sorted }));
    if (uid) {
      dispatch(updateProfileThunk({ uid, data: { quickAddPresets: sorted } }));
    }
    onClose();
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Edit Quick Add Presets"
      snapPoint={0.7}
    >
      <View style={{ paddingHorizontal: 24, paddingTop: 8 }}>
        {/* Current presets */}
        {[...presets]
          .sort((a, b) => a - b)
          .map((ml) => (
            <View
              key={ml}
              style={[
                styles.presetRow,
                {
                  borderColor: theme.cardBorder,
                  backgroundColor: theme.card,
                },
              ]}
            >
              <View
                style={[
                  styles.presetIconWrap,
                  { backgroundColor: theme.accent + "20" },
                ]}
              >
                <MaterialIcons name="water-drop" size={16} color={theme.accent} />
              </View>
              <Text style={[styles.presetAmount, { color: theme.text }]}>
                {displayAmount(ml)}
              </Text>
              <TouchableOpacity
                onPress={() => handleDelete(ml)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                style={styles.deleteBtn}
              >
                <MaterialIcons
                  name="close"
                  size={18}
                  color={theme.textSecondary}
                />
              </TouchableOpacity>
            </View>
          ))}

        {/* Add new preset */}
        {presets.length < PRESET_COUNT_MAX && (
          <View style={styles.addRow}>
            <View
              style={[
                styles.amountInput,
                {
                  borderColor: theme.inputBorder,
                  backgroundColor: theme.inputBackground,
                },
              ]}
            >
              <TextInput
                style={[styles.amountInputText, { color: theme.text }]}
                placeholder={unit === "oz" ? "e.g. 12" : "e.g. 300"}
                placeholderTextColor={theme.textSecondary + "80"}
                value={newAmount}
                onChangeText={setNewAmount}
                keyboardType={unit === "oz" ? "decimal-pad" : "number-pad"}
              />
              <Text
                style={{
                  color: theme.textSecondary,
                  fontFamily: FontFamily.regular,
                }}
              >
                {unit}
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleAdd}
              style={[styles.addBtn, { borderColor: theme.accent }]}
              activeOpacity={0.75}
            >
              <MaterialIcons name="add" size={22} color={theme.accent} />
            </TouchableOpacity>
          </View>
        )}

        <Text style={[styles.hint, { color: theme.textSecondary }]}>
          Up to {PRESET_COUNT_MAX} presets, {PRESET_MIN}–{PRESET_MAX} ml each.
        </Text>

        {/* Reset to defaults */}
        <TouchableOpacity
          onPress={handleReset}
          style={styles.resetRow}
          activeOpacity={0.7}
        >
          <MaterialIcons name="restart-alt" size={18} color={theme.accent} />
          <Text style={[styles.resetText, { color: theme.accent }]}>
            Reset to defaults
          </Text>
        </TouchableOpacity>

        <GradientButton
          label="Save Presets"
          onPress={handleSave}
          style={{ marginTop: 16 }}
        />
      </View>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  presetRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1.5,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
  },
  presetIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
  },
  presetAmount: {
    flex: 1,
    fontSize: FontSize.base,
    fontFamily: FontFamily.semibold,
  },
  deleteBtn: {
    padding: 4,
  },
  addRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 8,
  },
  amountInput: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderRadius: BorderRadius.md,
    paddingHorizontal: 16,
    height: 52,
    gap: 8,
  },
  amountInputText: {
    flex: 1,
    fontSize: FontSize.lg,
    fontFamily: FontFamily.bold,
  },
  addBtn: {
    width: 52,
    height: 52,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    justifyContent: "center",
    alignItems: "center",
  },
  hint: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.regular,
    marginTop: 10,
  },
  resetRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    marginTop: 4,
  },
  resetText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.semibold,
  },
});
