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
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              // Prevent climbing out of models folder via relative parent imports
              {
                group: ['../*', '../../*'],
                message:
                  'Models should not import from outside the models folder. Keep models pure and dependency-free.',
              },

              // Block any @shared subpath except @shared/models
              {
                group: ['@shared/!(models)', '@shared/!(models)/**'],
                message: 'Models may only import from @shared/models.',
              },

              // Prevent imports from apps/packages
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
