import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Avatar } from '@/components/primitives';
import { useFadeSheetAnimation } from '@/hooks/useFadeSheetAnimation';
import {
  useAddGroupAdminMutation,
  useGroupAdminsAllQuery,
  useGroupMembersQuery,
  useRemoveGroupAdminMutation,
} from '@/hooks/useApiQueries';
import { describeError } from '@/lib/api';
import { t } from '@/lib/i18n';
import {
  cardBase,
  colors,
  fontFamily,
  minTouchTarget,
  radius,
  spacing,
  typography,
} from '@/theme/tokens';

const ROW_HEIGHT = 56;
const VISIBLE_ROWS = 6;

export interface GroupAdminPickerSheetProps {
  visible: boolean;
  onRequestClose: () => void;
  groupId: string;
}

/**
 * Who runs this group — chosen from the people already in it.
 *
 * Only a super admin opens this (00111: they are the ones who appoint). Several people can run
 * one group, so this is a multi-select over the member list rather than a single pick, and it
 * saves the difference: tick someone and they are added, untick and they are removed. Reading
 * the full `group_admins` table rather than the community display list, because this is the
 * management view — the display one deliberately hides platform super admins.
 */
export function GroupAdminPickerSheet({
  visible,
  onRequestClose,
  groupId,
}: GroupAdminPickerSheetProps) {
  const { sheetFadeAnim } = useFadeSheetAnimation(visible);
  const { data: members = [], isLoading: membersLoading } = useGroupMembersQuery(groupId, {
    enabled: visible && !!groupId,
  });
  const { data: admins = [], isLoading: adminsLoading } = useGroupAdminsAllQuery(groupId, {
    enabled: visible && !!groupId,
  });
  const addAdmin = useAddGroupAdminMutation();
  const removeAdmin = useRemoveGroupAdminMutation();

  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const current = useMemo(() => admins.map((a) => a.userId), [admins]);

  // Reopening starts from what is true now, not from whatever was ticked last time.
  useEffect(() => {
    if (visible) {
      setSelected(current);
      setError(null);
    }
    // `current` is a fresh array each render; its contents are what matter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, current.join(',')]);

  const toggle = useCallback((userId: string) => {
    setSelected((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  }, []);

  const added = selected.filter((id) => !current.includes(id));
  const removed = current.filter((id) => !selected.includes(id));
  const dirty = added.length > 0 || removed.length > 0;

  const handleSave = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      // One at a time, so a failure halfway leaves a state the next open reflects honestly.
      for (const userId of added) {
        await addAdmin.mutateAsync({ groupId, userId });
      }
      for (const userId of removed) {
        await removeAdmin.mutateAsync({ groupId, userId });
      }
      onRequestClose();
    } catch (e) {
      setError(describeError(e));
    } finally {
      setSaving(false);
    }
  }, [added, removed, addAdmin, removeAdmin, groupId, onRequestClose]);

  const loading = membersLoading || adminsLoading;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onRequestClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onRequestClose}>
          <Animated.View
            style={[StyleSheet.absoluteFill, styles.backdrop, { opacity: sheetFadeAnim }]}
            pointerEvents="none"
          />
        </Pressable>

        <Animated.View style={[styles.dialog, { opacity: sheetFadeAnim }]}>
          <View style={styles.header}>
            <Text style={styles.title}>{t('groups.designateAdmins')}</Text>
            <Pressable
              onPress={onRequestClose}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel={t('common.cancel')}
            >
              <Ionicons name="close" size={22} color={colors.onSurfaceVariant} />
            </Pressable>
          </View>
          <Text style={styles.subtitle}>{t('groups.designateAdminsHint')}</Text>

          {loading ? (
            <View style={styles.loading}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : members.length === 0 ? (
            <Text style={styles.empty}>{t('groups.designateAdminsNoMembers')}</Text>
          ) : (
            <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
              {members.map((m) => {
                const on = selected.includes(m.userId);
                return (
                  <Pressable
                    key={m.userId}
                    onPress={() => toggle(m.userId)}
                    style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: on }}
                    accessibilityLabel={m.displayName ?? m.userId}
                    accessibilityHint={t('groups.designateAdminsToggleHint')}
                  >
                    <Avatar
                      source={m.avatarUrl ? { uri: m.avatarUrl } : null}
                      fallbackText={m.displayName}
                      size="md"
                    />
                    <Text style={styles.rowName} numberOfLines={1}>
                      {m.displayName ?? t('groups.unnamedMember')}
                    </Text>
                    <View style={[styles.check, on && styles.checkOn]}>
                      {on ? <Ionicons name="checkmark" size={15} color={colors.onAccent} /> : null}
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}

          {error ? (
            <Text style={styles.error} accessibilityLiveRegion="polite">
              {error}
            </Text>
          ) : null}

          <Pressable
            onPress={() => void handleSave()}
            disabled={!dirty || saving}
            style={({ pressed }) => [
              styles.save,
              (!dirty || saving) && styles.saveDisabled,
              pressed && styles.rowPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={t('common.save')}
            accessibilityHint={t('groups.designateAdminsSaveHint')}
          >
            <Text style={styles.saveText}>{saving ? t('common.loading') : t('common.save')}</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.screenHorizontal,
  },
  backdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  dialog: {
    ...cardBase,
    width: '100%',
    maxWidth: 480,
    maxHeight: '80%',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    flex: 1,
    minWidth: 0,
    fontFamily: fontFamily.serif,
    fontSize: 19,
    color: colors.onSurface,
  },
  subtitle: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    marginTop: spacing.xxs,
    marginBottom: spacing.sm,
  },
  loading: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  empty: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    paddingVertical: spacing.lg,
  },
  list: {
    flexGrow: 0,
    maxHeight: ROW_HEIGHT * VISIBLE_ROWS,
  },
  listContent: {
    paddingBottom: spacing.xs,
  },
  row: {
    height: ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.outlineVariant,
  },
  rowPressed: {
    opacity: 0.7,
  },
  rowName: {
    flex: 1,
    minWidth: 0,
    ...typography.bodyMd,
    color: colors.onSurface,
  },
  check: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOn: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  error: {
    ...typography.bodyMd,
    color: colors.error,
    marginTop: spacing.sm,
  },
  save: {
    marginTop: spacing.md,
    height: minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.button,
    backgroundColor: colors.accent,
  },
  saveDisabled: {
    opacity: 0.45,
  },
  saveText: {
    ...typography.buttonLabel,
    color: colors.onAccent,
  },
});
