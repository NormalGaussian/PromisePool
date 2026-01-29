# Contributing

## Development

```bash
# Install dependencies
yarn install

# Run tests
yarn test

# Build
yarn build
```

## Publishing

Releases are automated via GitHub Actions when a version tag is pushed.

### Setup (one-time)

1. Generate an npm access token at https://www.npmjs.com/settings/~/tokens
2. Add the token as `NPM_TOKEN` in your GitHub repository secrets

### Release process

1. Update the version in `package.json`
2. Commit the change:
   ```bash
   git add package.json
   git commit -m "Release vX.Y.Z"
   ```
3. Tag the release:
   ```bash
   git tag vX.Y.Z
   ```
4. Push the commit and tag:
   ```bash
   git push origin master --tags
   ```

The GitHub Action will automatically run tests, build, and publish to npm.
