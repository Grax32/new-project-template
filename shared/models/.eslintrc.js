module.exports = {
  root: true,
  overrides: [
    {
      files: ['*.ts'],
      parserOptions: {
        project: ['./tsconfig.json'],
        tsconfigRootDir: __dirname,
      },
      rules: {
        // Disallow imports from outside the models folder
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              {
                group: ['../*', '../../*', '@shared/*', '!@shared/models'],
                message: 'Models should not import from outside the models folder. Keep models pure and dependency-free.',
              },
              {
                group: ['**/apps/**', '**/packages/**'],
                message: 'Models cannot import from apps or packages. Keep models independent.',
              },
            ],
          },
        ],
      },
    },
  ],
};
