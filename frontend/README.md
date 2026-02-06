# FinTwin Frontend

React frontend for the FinTwin AI-Powered Goal-Based Financial Planning platform.

## Tech Stack

- **Framework**: React 19.2 with Vite 7.x
- **UI Libraries**: 
  - Tailwind CSS 4.x + DaisyUI 5.x
  - Material-UI 7.x
  - Recharts 3.x (data visualization)
  - Lucide React (icons)
- **Routing**: React Router DOM 7.x
- **HTTP Client**: Axios
- **Testing**: Vitest 4.x + Testing Library + Happy-DOM
- **E2E Testing**: Cypress

## Getting Started

### Prerequisites

- Node.js >= 20.0.0
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The application will be available at `http://localhost:5173`

### Environment Variables

Create a `.env` file in the frontend directory:

```env
# API Base URL
VITE_API_BASE_URL=http://localhost:5001/api

# Feature Flags (optional)
VITE_ENABLE_DEBUG=false
```

## Development

### Available Scripts

```bash
# Start development server with hot reload
npm run dev

# Run unit tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --run --coverage

# Run linter
npm run lint

# Build for production
npm run build

# Preview production build
npm run preview

# Run Cypress E2E tests
npx cypress open
```

### Project Structure

```
frontend/
├── public/              # Static assets
├── src/
│   ├── components/      # Reusable React components (60+)
│   │   ├── goals/       # Goal-related components
│   │   │   └── engine/  # AI engine components
│   │   ├── wealth/      # Wealth management components
│   │   ├── landing/     # Landing page components
│   │   └── ...
│   ├── pages/           # Page components (25+)
│   │   ├── GoalIntakePage.jsx       # Main goal planning (1,909 lines)
│   │   ├── WealthCenterPage.jsx     # Wealth management
│   │   ├── Dashboard.jsx            # User dashboard
│   │   └── ...
│   ├── services/        # API client services
│   ├── utils/           # Helper functions
│   ├── tests/           # Test files
│   ├── App.jsx          # Main application component
│   └── main.jsx         # Application entry point
├── cypress/             # E2E test files
├── vitest.config.js     # Vitest configuration
├── cypress.config.js    # Cypress configuration
└── vite.config.js       # Vite configuration
```

## Testing

### Unit Testing

This project uses **Vitest** with **Testing Library** and **Happy-DOM**.

```bash
# Run all tests
npm test -- --run

# Run tests in watch mode
npm test

# Run with coverage
npm test -- --run --coverage
```

**Current Test Coverage:**
- Goal engine components: 5 test suites
  - `AssumptionForm.test.jsx`
  - `ConfirmedCard.test.jsx`
  - `Copilot.test.jsx`
  - `GapAnalysisForm.test.jsx`
  - `SubstageStepIndicator.test.jsx`

### E2E Testing

This project uses **Cypress** for end-to-end testing.

```bash
# Open Cypress UI
npx cypress open

# Run Cypress tests headlessly
npx cypress run
```

**Test Files:** 23 Cypress test files covering main user workflows

## CI/CD

### GitHub Actions Workflows

The frontend is automatically tested through GitHub Actions:

1. **CI Pipeline** (`.github/workflows/ci.yml`)
   - Runs unit tests on every push/PR to main
   - Generates coverage reports
   - Runs ESLint checks
   - Builds production bundle and checks size

2. **Frontend Tests** (`.github/workflows/test.yml`)
   - Matrix testing on Node.js 18.x and 20.x
   - Verbose test output

3. **PR Protection** (`.github/workflows/pr-protection.yml`)
   - Detects large deletions (>1000 lines)
   - Warns about test file deletions

### Best Practices

✅ **Do:**
- Run tests locally before pushing (`npm test`)
- Fix linting errors (`npm run lint`)
- Test build locally (`npm run build`)
- Keep components modular and testable

❌ **Don't:**
- Ignore CI failures
- Delete tests without replacement
- Commit large deletions without review

## Key Components

### Goal Engine Components

- **`Copilot.jsx`** (1,045 lines): AI chatbox with streaming responses
- **`AssumptionForm.jsx`**: Assumption stage form with validation
- **`GapAnalysisForm.jsx`**: Gap analysis stage form
- **`ConfirmedCard.jsx`**: Confirmed decision display card
- **`SubstageStepIndicator.jsx`**: Stage progress indicator

### Pages

- **`GoalIntakePage.jsx`** (1,909 lines): Main goal planning interface with 4-stage workflow
- **`WealthCenterPage.jsx`**: Asset-liability management and cash flow tracking
- **`Dashboard.jsx`**: User dashboard with goal overview and net worth visualization
- **`LandingPage.jsx`**: Landing page with hero section and features

## Features

### 🎯 Goal-Based Planning
- AI-guided 4-stage planning process
- Dynamic form generation
- Real-time streaming AI responses
- Session-based context isolation

### 💼 Wealth Management
- Asset-liability tracking
- Cash flow analysis
- Interactive charts (Recharts)
- Net worth visualization

### 🤖 AI Integration
- Streaming Server-Sent Events (SSE)
- Markdown rendering with KaTeX math support
- Citation rendering from RAG
- Function calling visualization

### 🔒 Privacy Controls
- Toggle data sharing with AI
- Granular data type selection
- Request-level override

## Contributing

Please read the main [CONTRIBUTING.md](../README.md#-contributing) for development workflow and code style guidelines.

### Code Style

- Use **functional components** with hooks
- Follow **React best practices**
- Use **Tailwind CSS** for styling
- Add **PropTypes** or TypeScript for type checking
- Write **tests** for new components

## Learn More

- [React Documentation](https://react.dev)
- [Vite Documentation](https://vite.dev)
- [Vitest Documentation](https://vitest.dev)
- [Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Cypress Documentation](https://docs.cypress.io)

## License

This project is part of the FinTwin platform and is licensed under the MIT License.
