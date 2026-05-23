module.exports = {
  root: true,
  extends: '@react-native',
  rules: {
    '@typescript-eslint/no-unused-expressions': [
      'error',
      {
        allowShortCircuit: false,
        allowTernary: false,
        allowTaggedTemplates: false,
      },
    ],
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-require-imports': 'off',
    'react-hooks/set-state-in-effect': 'off',
    'react-hooks/incompatible-library': 'off',
    'react-refresh/only-export-components': 'off',
    'react-native/no-inline-styles': 'off',
    '@typescript-eslint/no-shadow': 'off',
    'eslint-comments/no-unused-disable': 'off',
    'react/no-unstable-nested-components': 'off',
  },
};
