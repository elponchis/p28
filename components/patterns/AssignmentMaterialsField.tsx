import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Button } from '@/components/primitives';
import { UploadProgressBar } from '@/components/patterns/UploadProgressBar';
import { useUploadAssignmentMaterialMutation } from '@/hooks/useApiQueries';
import { getUserFacingError } from '@/lib/api';
import type { UploadedFile } from '@/lib/api';
import {
  MAX_ASSIGNMENT_MATERIALS,
  SUBMISSION_PICKER_MIME_WHITELIST,
} from '@/lib/api/assignmentSubmissions';
import { normalizeMimeTypeForAllowlist } from '@/lib/api/messageAttachments';
import { enqueueDocumentPick } from '@/lib/documentPickerLock';
import { formatFileSize } from '@/lib/formatFileSize';
import { t } from '@/lib/i18n';
import { colors, radius, spacing, typography } from '@/theme/tokens';

export interface AssignmentMaterialsFieldProps {
  groupId: string;
  userId: string;
  materials: UploadedFile[];
  onChange: (materials: UploadedFile[]) => void;
  disabled?: boolean;
}

/** Instructor-facing picker/list for an assignment's reference material files (uploads on pick). */
export function AssignmentMaterialsField({
  groupId,
  userId,
  materials,
  onChange,
  disabled,
}: AssignmentMaterialsFieldProps) {
  const uploadMutation = useUploadAssignmentMaterialMutation();
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const handleAddMaterial = async () => {
    setError(null);
    if (materials.length >= MAX_ASSIGNMENT_MATERIALS) {
      setError(t('assignments.tooManyMaterials'));
      return;
    }
    let result: Awaited<ReturnType<typeof DocumentPicker.getDocumentAsync>>;
    try {
      result = await enqueueDocumentPick(() =>
        DocumentPicker.getDocumentAsync({
          type: SUBMISSION_PICKER_MIME_WHITELIST,
          multiple: false,
          copyToCacheDirectory: true,
        })
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.error'));
      return;
    }
    if (result.canceled || !result.assets?.[0]) return;
    const doc = result.assets[0];
    const mimeType = normalizeMimeTypeForAllowlist(doc.mimeType ?? 'application/octet-stream');

    setProgress(0);
    uploadMutation.mutate(
      {
        groupId,
        userId,
        localUri: doc.uri,
        contentType: mimeType,
        fileName: doc.name || 'file',
        onProgress: setProgress,
      },
      {
        onSuccess: (file) => {
          onChange([...materials, file]);
          setProgress(0);
        },
        onError: (err) => setError(getUserFacingError(err)),
      }
    );
  };

  const handleRetry = () => {
    if (!uploadMutation.variables) return;
    setError(null);
    setProgress(0);
    uploadMutation.mutate(uploadMutation.variables, {
      onSuccess: (file) => {
        onChange([...materials, file]);
        setProgress(0);
      },
      onError: (err) => setError(getUserFacingError(err)),
    });
  };

  const handleRemove = (path: string) => {
    onChange(materials.filter((m) => m.path !== path));
  };

  const isUploading = uploadMutation.isPending;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{t('assignments.materialsLabel')}</Text>
      <Text style={styles.hint}>{t('assignments.materialsHint')}</Text>

      {materials.length > 0 ? (
        <View style={styles.list}>
          {materials.map((material) => (
            <View key={material.path} style={styles.row}>
              <Ionicons name="document-text-outline" size={18} color={colors.primary} />
              <Text style={styles.rowName} numberOfLines={1}>
                {material.name}
              </Text>
              {material.size ? (
                <Text style={styles.rowSize}>{formatFileSize(material.size)}</Text>
              ) : null}
              <Pressable
                onPress={() => handleRemove(material.path)}
                disabled={disabled}
                accessibilityLabel={t('assignments.removeMaterial')}
                accessibilityHint={t('assignments.removeMaterialHint')}
                accessibilityRole="button"
              >
                <Ionicons name="close-circle" size={18} color={colors.onSurfaceVariant} />
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}

      {isUploading ? (
        <View style={styles.progressRow}>
          <UploadProgressBar progress={progress} />
        </View>
      ) : null}

      {error ? (
        <View style={styles.errorRow}>
          <Text style={styles.errorText}>{error}</Text>
          {uploadMutation.isError ? (
            <Button
              title={t('attachments.retryUpload')}
              variant="text"
              onPress={handleRetry}
              accessibilityLabel={t('attachments.retryUpload')}
              accessibilityHint={t('attachments.retryUploadHint')}
            />
          ) : null}
        </View>
      ) : null}

      <Pressable
        onPress={handleAddMaterial}
        disabled={disabled || isUploading || materials.length >= MAX_ASSIGNMENT_MATERIALS}
        style={({ pressed }) => [styles.addButton, pressed && styles.addButtonPressed]}
        accessibilityLabel={t('assignments.addMaterial')}
        accessibilityHint={t('assignments.addMaterialHint')}
        accessibilityRole="button"
      >
        {isUploading ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <Ionicons name="add" size={18} color={colors.primary} />
        )}
        <Text style={styles.addButtonText}>{t('assignments.addMaterial')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    ...typography.label,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  hint: {
    ...typography.caption,
    color: colors.onSurfaceVariant,
    marginBottom: spacing.sm,
  },
  list: {
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.sm,
    padding: spacing.sm,
  },
  rowName: {
    ...typography.bodyMd,
    color: colors.textPrimary,
    flex: 1,
    minWidth: 0,
  },
  rowSize: {
    ...typography.caption,
    color: colors.onSurfaceVariant,
  },
  progressRow: {
    marginBottom: spacing.sm,
  },
  errorRow: {
    marginBottom: spacing.sm,
  },
  errorText: {
    ...typography.caption,
    color: colors.error,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
  },
  addButtonPressed: {
    opacity: 0.7,
  },
  addButtonText: {
    ...typography.label,
    color: colors.primary,
  },
});
