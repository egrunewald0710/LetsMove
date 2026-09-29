import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/theme/theme';

export default function withSafeArea<Props extends React.JSX.IntrinsicAttributes>(
  Screen: React.ComponentType<Props>
) {
  return function SafeAreaScreen(props: Props) {
    return (
      <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
        <Screen {...props} />
      </SafeAreaView>
    );
  };
}