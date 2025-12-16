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
                            // Prevent climbing out of the contracts folder via relative parent imports
                            { group: ['../*', '../../*'], message: 'Contracts may only import from within contracts or models folders.' },

                            // Block any @shared subpath except @shared/contracts and @shared/models
                            { group: ['@shared/!(contracts|models)', '@shared/!(contracts|models)/**'], message: 'Contracts may only import from @shared/contracts or @shared/models.' },

                            // Prevent imports from apps/packages
                            { group: ['**/apps/**', '**/packages/**'], message: 'Contracts cannot import from apps or packages.' }
                        ],
                    },
                ],
            },
        },
    ],
};