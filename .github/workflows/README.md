# GitHub Actions CI/CD Workflows

This directory contains automated workflows for the Money-Minds project.

## Workflows

### 1. **test.yml** - Frontend Tests
- **Trigger**: Push or PR to `main`, `master`, `develop` branches
- **Purpose**: Run frontend unit tests
- **Matrix**: Tests on Node.js 18.x and 20.x
- **Steps**:
  - Checkout code
  - Setup Node.js with caching
  - Install dependencies
  - Run tests with verbose output

### 2. **ci.yml** - Full CI Pipeline
- **Trigger**: Push or PR to `main`, `master`, `develop` branches
- **Jobs**:
  - **frontend-test**: Run frontend tests with coverage
  - **backend-test**: Run backend tests (if configured)
  - **lint**: Code quality checks with ESLint
  - **build**: Build verification and size check
- **Features**:
  - Code coverage reporting to Codecov
  - Large file change detection
  - Build artifact size monitoring

### 3. **pr-protection.yml** - PR Protection Checks
- **Trigger**: PR opened, synchronized, or reopened
- **Purpose**: Prevent destructive changes
- **Checks**:
  - ⚠️ Large deletions (>1000 lines) - warns but doesn't fail
  - ⚠️ Test file deletions - alerts when tests are removed
- **Why**: Prevents accidental deletion of critical code (like the GoalIntakePage incident)

## How to Use

### Running Locally

```bash
# Frontend tests
cd frontend
npm test -- --run

# Frontend tests with coverage
npm test -- --run --coverage

# Linting
npm run lint

# Build
npm run build
```

### Viewing CI Results

1. Go to the **Actions** tab in your GitHub repository
2. Select a workflow run to see detailed results
3. Check the **Summary** section for warnings about large changes

## CI/CD Best Practices

✅ **Do:**
- Run tests locally before pushing
- Review large diffs carefully
- Keep test coverage high
- Fix linting errors before committing

❌ **Don't:**
- Delete large amounts of code without team review
- Remove tests without replacing them
- Ignore CI failures
- Bypass PR checks

## Protection Features

This CI/CD setup includes safeguards against:
- 🛡️ Accidental large-scale deletions
- 🛡️ Test coverage regression
- 🛡️ Build failures
- 🛡️ Code quality issues

## Troubleshooting

### Tests failing in CI but passing locally?
- Check Node.js version (CI uses 18.x and 20.x)
- Ensure all dependencies are in `package.json`
- Check for environment-specific issues

### Large deletion warning?
- Review the changes carefully
- Ensure it's intentional refactoring
- Document the reason in PR description
- Get team approval before merging

### Build failing?
- Check for TypeScript/ESLint errors
- Verify all imports are correct
- Ensure build dependencies are installed

## Maintenance

Update workflows when:
- Adding new test frameworks
- Changing Node.js version requirements
- Adding deployment steps
- Modifying build process
