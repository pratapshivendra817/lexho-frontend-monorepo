/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import App from '../App';

jest.mock('@react-navigation/native', () => ({
  DefaultTheme: {
    colors: {
      background: '#000000',
    },
  },
  NavigationContainer: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('../src/navigation/AppNavigator', () => {
  const ReactNative = require('react-native');
  const MockNavigator = () => <Text>Mock Navigator</Text>;
  const { Text } = ReactNative;
  return MockNavigator;
});

test('renders correctly', async () => {
  await ReactTestRenderer.act(() => {
    ReactTestRenderer.create(<App />);
  });
});
