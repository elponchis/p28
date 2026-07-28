import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Button } from '@/components/primitives';
import { Input } from '@/components/primitives/Input';
import { useAuth } from '@/hooks/useAuth';
import {
  useDeleteDiscussionMutation,
  useDiscussionQuery,
  useUpdateDiscussionMutation,
} from '@/hooks/useApiQueries';
import { getUserFacingError } from '@/lib/api';
import { t } from '@/lib/i18n';
import { colors, radius, spacing, typography } from '@/theme/tokens';

export default function EditDiscussionScreen() {
  const { discussionId } = useLocalSearchParams<{ discussionId: string }>();
  const { session } = useAuth();
  const router = useRouter();
  const userId = session?.user?.id;

  const { data: discussion, isLoading, isError, error } = useDiscussionQuery(discussionId);
  const updateMutation = useUpdateDiscussionMutation();
  const deleteMutation = useDeleteDiscussionMutation();
  const isSubmitting = updateMutation.isPending || deleteMutation.isPending;

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (discussion) {
      setTitle(discussion.title);
      setBody(discussion.body ?? '');
    }
  }, [discussion]);

  const mutationError = updateMutation.error ?? deleteMutation.error;

  const handleSave = () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle || !discussionId) return;

    setErrorMessage(null);
    updateMutation.mutate(
      {
        discussionId,
        params: { title: trimmedTitle, body: body.trim() || trimmedTitle },
      },
      {
        onSuccess: () => router.back(),
        onError: (err) => setErrorMessage(getUserFacingError(err)),
      }
    );
  };

  const handleDelete = () => {
    if (!discussionId) return;

    Alert.alert(t('discussions.deleteDiscussion'), t('discussions.deleteDiscussionConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('discussions.deleteDiscussion'),
        style: 'destructive',
        onPress: () => {
          setErrorMessage(null);
          deleteMutation.mutate(
            { discussionId },
            {
              onSuccess: () => {
                router.replace(`/group/${discussion?.groupId ?? ''}`);
              },
              onError: (err) => setErrorMessage(getUserFacingError(err)),
            }
          );
        },
      },
    ]);
  };

  useEffect(() => {
    if (discussionId && isError) {
      router.back();
    }
  }, [discussionId, isError, router]);

  if (!discussionId) {
    return null;
  }

  if (isLoading || !discussion) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
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

        {errorMessage || (mutationError && 'message' in mutationError) ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>
              {errorMessage ??
                (mutationError && 'message' in mutationError
                  ? getUserFacingError(mutationError)
                  : '')}
            </Text>
          </View>
        ) : null}

        <View style={styles.actions}>
          <Button
            title={isSubmitting ? t('common.loading') : t('common.save')}
            onPress={handleSave}
            disabled={!title.trim() || isSubmitting}
            fullWidth
            accessibilityLabel={t('common.save')}
            accessibilityHint={t('discussions.editDiscussionHint')}
          />
          <Button
            title={t('common.cancel')}
            variant="secondary"
            onPress={() => router.back()}
            disabled={isSubmitting}
            fullWidth
            accessibilityLabel={t('common.cancel')}
          />
        </View>

        <View style={styles.deleteSection}>
          <Pressable
            onPress={handleDelete}
            disabled={isSubmitting}
            style={({ pressed }) => [
              styles.deleteButton,
              pressed && styles.deleteButtonPressed,
              isSubmitting && styles.deleteButtonDisabled,
            ]}
            accessibilityLabel={t('discussions.deleteDiscussion')}
            accessibilityHint={t('discussions.deleteDiscussionConfirm')}
            accessibilityRole="button"
          >
            <Ionicons name="trash-outline" size={20} color={colors.error} />
            <Text style={styles.deleteButtonText}>{t('discussions.deleteDiscussion')}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.screenHorizontal,
    paddingBottom: spacing.xl,
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
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  deleteSection: {
    marginTop: spacing.xxl,
    backgroundColor: colors.surfaceContainerHigh,
    borderRadius: radius.input,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  deleteButtonPressed: {
    opacity: 0.8,
  },
  deleteButtonDisabled: {
    opacity: 0.5,
  },
  deleteButtonText: {
    ...typography.body,
    color: colors.error,
  },
});
