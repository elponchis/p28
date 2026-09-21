import React from 'react';
import { StyleSheet } from 'react-native';

import { ExternalLink } from './ExternalLink';
import { MonoText } from './StyledText';
import { Text, View } from './Themed';

import { colors, radius } from '@/theme/tokens';

export default function EditScreenInfo({ path }: { path: string }) {
  return (
    <View>
      <View style={styles.getStartedContainer}>
        <Text style={styles.getStartedText}>Open up the code for this screen:</Text>

        <View style={[styles.codeHighlightContainer, styles.homeScreenFilename]}>
          <MonoText>{path}</MonoText>
        </View>

        <Text style={styles.getStartedText}>
          Change any of the text, save the file, and your app will automatically update.
        </Text>
      </View>

      <View style={styles.helpContainer}>
        <ExternalLink
          style={styles.helpLink}
          href="https://docs.expo.io/get-started/create-a-new-app/#opening-the-app-on-your-phonetablet"
        >
          <Text style={[styles.helpLinkText, { color: colors.primary }]}>
            Tap here if your app doesn't automatically update after making changes
          </Text>
        </ExternalLink>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  getStartedContainer: {
    alignItems: 'center',
    marginHorizontal: 48,
  },
  homeScreenFilename: {
    marginVertical: 8,
  },
  codeHighlightContainer: {
    borderRadius: radius.sm,
    paddingHorizontal: 4,
    backgroundColor: colors.surfaceHighlight,
  },
  getStartedText: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    color: colors.textSecondary,
  },
  helpContainer: {
    marginTop: 16,
    marginHorizontal: 20,
    alignItems: 'center',
  },
  helpLink: {
    paddingVertical: 16,
  },
  helpLinkText: {
    textAlign: 'center',
  },
});
