import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Button, Input } from '@/components/primitives';
import { useAuth } from '@/hooks/useAuth';
import {
  useCreateDiscussionMutation,
  useGroupQuery,
  useGroupsForUserQuery,
} from '@/hooks/useApiQueries';
import { getUserFacingError } from '@/lib/api';
import { t } from '@/lib/i18n';
import { colors, fontFamily, radius, spacing, typography } from '@/theme/tokens';

export default function CreateDiscussionScreen() {
  const { groupId: paramGroupId } = useLocalSearchParams<{ groupId?: string }>();
  const { session } = useAuth();
  const router = useRouter();
  const userId = session?.user?.id;

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState<string | undefined>(
    paramGroupId ?? undefined
  );
  const [groupPickerVisible, setGroupPickerVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const groupId = selectedGroupId ?? paramGroupId;
  const { data: groups = [] } = useGroupsForUserQuery(userId);
  const memberGroups = groups.filter((g) => g.id);
  const { data: selectedGroup } = useGroupQuery(groupId);
  const createMutation = useCreateDiscussionMutation();
  const isSubmitting = createMutation.isPending;

  const handleSubmit = () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle || !userId || !groupId) return;
    setError(null);
    createMutation.mutate(
      {
        groupId,
        userId,
        input: { title: trimmedTitle, body: body.trim() || trimmedTitle },
      },
      {
        onSuccess: (discussion) => router.replace(`/group/discussion/${discussion.id}`),
        onError: (err) => setError(getUserFacingError(err)),
      }
    );
  };

  if (!userId) {
    router.replace('/(tabs)/groups');
    return null;
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {!paramGroupId ? (
          <View style={styles.groupField}>
            <Text style={styles.fieldLabel}>{t('groups.title')}</Text>
            <Pressable
              onPress={() => setGroupPickerVisible(true)}
              style={({ pressed }) => [styles.groupSelect, pressed && styles.groupSelectPressed]}
              accessibilityLabel={t('groups.title')}
              accessibilityHint={t('discussions.selectGroupHint')}
            >
              <Text style={styles.groupSelectText}>
                {selectedGroup ? selectedGroup.name : t('common.loading')}
              </Text>
              <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
            </Pressable>
          </View>
        ) : null}

        <Input
          label={t('discussions.topicPlaceholder')}
          value={title}
          onChangeText={setTitle}
          placeholder={t('discussions.topicPlaceholder')}
          autoCapitalize="sentences"
          editable={!isSubmitting}
          accessibilityLabel={t('discussions.topicPlaceholder')}
        />

        <Input
          label={t('discussions.bodyPlaceholder')}
          value={body}
          onChangeText={setBody}
          placeholder={t('discussions.bodyPlaceholder')}
          multiline
          numberOfLines={4}
          inputStyle={{ minHeight: 100, textAlignVertical: 'top' }}
          editable={!isSubmitting}
          accessibilityLabel={t('discussions.bodyPlaceholder')}
        />

        <View style={styles.conductReminder}>
          <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
          <Text style={styles.conductReminderText}>{t('discussions.conductReminder')}</Text>
        </View>

        {error || (createMutation.error && 'message' in createMutation.error) ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>
              {error ??
                (createMutation.error && 'message' in createMutation.error
                  ? getUserFacingError(createMutation.error)
                  : '')}
            </Text>
          </View>
        ) : null}

        <View style={styles.actions}>
          <Button
            title={t('common.cancel')}
            variant="secondary"
            onPress={() => router.back()}
            disabled={isSubmitting}
            accessibilityLabel={t('common.cancel')}
          />
          <Button
            title={isSubmitting ? t('common.loading') : t('discussions.createDiscussion')}
            onPress={handleSubmit}
            disabled={!title.trim() || !groupId || isSubmitting}
            accessibilityLabel={t('discussions.createDiscussion')}
            accessibilityHint={t('discussions.createDiscussionHint')}
          />
        </View>
      </ScrollView>

      <Modal
        visible={groupPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setGroupPickerVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setGroupPickerVisible(false)} />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('groups.title')}</Text>
              <Pressable
                onPress={() => setGroupPickerVisible(false)}
                hitSlop={8}
                accessibilityLabel={t('common.cancel')}
              >
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </Pressable>
            </View>
            <FlatList
              data={memberGroups}
              keyExtractor={(item) => item.id}
              style={styles.modalList}
              renderItem={({ item }) => (
                <Pressable
                  style={[
                    styles.modalOption,
                    selectedGroupId === item.id && styles.modalOptionSelected,
                  ]}
                  onPress={() => {
                    setSelectedGroupId(item.id);
                    setGroupPickerVisible(false);
                  }}
                  accessibilityLabel={item.name}
                  accessibilityState={{ selected: selectedGroupId === item.id }}
                >
                  <Text
                    style={[
                      styles.modalOptionText,
                      selectedGroupId === item.id && styles.modalOptionTextSelected,
                    ]}
                  >
                    {item.name}
                  </Text>
                  {selectedGroupId === item.id && (
                    <Ionicons name="checkmark" size={20} color={colors.primary} />
                  )}
                </Pressable>
              )}
              ListEmptyComponent={
                <View style={styles.modalEmpty}>
                  <Text style={styles.modalEmptyText}>{t('groups.noJoinedGroups')}</Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.screenHorizontal,
    paddingBottom: spacing.xl,
  },
  groupField: {
    marginBottom: spacing.sm,
  },
  fieldLabel: {
    fontFamily: fontFamily.sansBold,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    color: colors.onSurfaceVariant,
    marginBottom: spacing.xs,
    paddingHorizontal: 2,
  },
  groupSelect: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceContainer,
    borderRadius: radius.lg,
    paddingHorizontal: 20,
    paddingVertical: 16,
    minHeight: 48,
  },
  groupSelectPressed: {
    backgroundColor: colors.primaryFixed,
  },
  groupSelectText: {
    fontFamily: fontFamily.sans,
    fontSize: 15,
    fontWeight: '400',
    color: colors.onSurface,
    flex: 1,
  },
  conductReminder: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.brandSoft,
    padding: spacing.md,
    borderRadius: radius.button,
    marginBottom: spacing.lg,
  },
  conductReminderText: {
    ...typography.caption,
    color: colors.textPrimary,
    flex: 1,
  },
  errorBanner: {
    backgroundColor: colors.amberSoft,
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.md,
  },
  errorText: {
    ...typography.body,
    color: colors.textPrimary,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(28, 28, 28, 0.4)',
    justifyContent: 'center',
    padding: spacing.lg,
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    maxHeight: '70%',
    width: '100%',
    maxWidth: 400,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    backgroundColor: colors.surfaceContainerHigh,
  },
  modalTitle: {
    ...typography.title,
    color: colors.textPrimary,
  },
  modalList: {
    maxHeight: 400,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  modalOptionSelected: {
    backgroundColor: colors.brandSoft,
  },
  modalOptionText: {
    ...typography.body,
    color: colors.textPrimary,
  },
  modalOptionTextSelected: {
    ...typography.bodyStrong,
    color: colors.primary,
  },
  modalEmpty: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  modalEmptyText: {
    ...typography.body,
    color: colors.textSecondary,
  },
});
