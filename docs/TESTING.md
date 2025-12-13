# 🧪 CineMate Testing Guide

Complete guide for running unit tests, integration tests, and API tests for the CineMate application.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Testing Stack](#testing-stack)
- [Installation](#installation)
- [Running Tests](#running-tests)
- [Test Structure](#test-structure)
- [Writing Tests](#writing-tests)
- [Coverage Reports](#coverage-reports)
- [CI/CD Integration](#cicd-integration)
- [Troubleshooting](#troubleshooting)

---

## 🎯 Overview

CineMate uses a comprehensive testing strategy covering:

- **Unit Tests**: Test individual components and functions
- **Integration Tests**: Test complete user flows
- **API Tests**: Test all API endpoints
- **Coverage Reports**: Ensure code quality

### Test Coverage Goals

- **Branches**: 50%+
- **Functions**: 50%+
- **Lines**: 50%+
- **Statements**: 50%+

---

## 🛠️ Testing Stack

| Tool | Purpose | Version |
|------|---------|---------|
| **Jest** | Testing framework | ^29.7.0 |
| **@testing-library/react** | React component testing | ^14.1.2 |
| **@testing-library/jest-dom** | Custom matchers | ^6.1.5 |
| **ts-jest** | TypeScript support | ^29.1.1 |
| **node-mocks-http** | HTTP request/response mocks | ^1.14.0 |
| **jest-mock-extended** | Advanced mocking | ^3.0.5 |

---

## 📦 Installation

### 1. Install Dependencies

If you haven't already installed testing dependencies:

```bash
npm install
```

This will install all required testing packages from `package.json`.

### 2. Verify Installation

Check that Jest is installed:

```bash
npx jest --version
```

You should see version `29.7.0` or higher.

---

## 🚀 Running Tests

### All Tests

Run all tests with coverage:

```bash
npm test
```

### Watch Mode

Run tests in watch mode (auto-rerun on file changes):

```bash
npm run test:watch
```

### Specific Test Types

#### Unit Tests Only

```bash
npm run test:unit
```

Tests files in: `__tests__/unit/**/*.test.ts`

#### Integration Tests Only

```bash
npm run test:integration
```

Tests files in: `__tests__/integration/**/*.test.ts`

#### API Tests Only

```bash
npm run test:api
```

Tests files in: `__tests__/api/**/*.test.ts`

### Run Specific Test File

```bash
npx jest __tests__/api/ratings.test.ts
```

### Run Tests Matching Pattern

```bash
npx jest --testNamePattern="should return 401"
```

### Run Tests with Verbose Output

```bash
npx jest --verbose
```

---

## 📁 Test Structure

```
cinemate/
├── __tests__/
│   ├── api/                        # API endpoint tests
│   │   ├── search-ai.test.ts       # Perplexity search API tests
│   │   ├── ratings.test.ts         # Ratings CRUD tests
│   │   ├── watchlist.test.ts       # Watchlist CRUD tests
│   │   └── recommendations.test.ts # AI recommendations tests
│   ├── integration/                # Integration tests
│   │   └── movie-rating-flow.test.ts # Complete user flow tests
│   ├── helpers/                    # Test utilities
│   │   └── test-utils.ts           # Mock data & helpers
├── jest.config.js                  # Jest configuration
├── jest.setup.js                   # Global test setup
└── TESTING.md                      # This file
```

---

## 📝 Test Structure Breakdown

### API Tests (`__tests__/api/`)

Test all API endpoints for:
- ✅ Authentication checks (401 responses)
- ✅ Validation (400 responses for missing/invalid data)
- ✅ Success cases (200 responses with correct data)
- ✅ Error handling (500 responses)
- ✅ Database operations
- ✅ Filter application

#### Example: Ratings API Tests

```typescript
describe('POST /api/ratings', () => {
  it('should return 401 if user is not authenticated')
  it('should return 400 if required fields are missing')
  it('should create a new rating')
  it('should update an existing rating')
  it('should validate rating values')
})
```

### Unit Tests (`__tests__/unit/`)

Test individual modules and functions:
- ✅ Perplexity API integration
- ✅ OpenAI GPT & RAG functionality
- ✅ Utility functions
- ✅ Helper modules

#### Example: Perplexity API Tests

```typescript
describe('Perplexity API Integration', () => {
  it('should generate recommendations using Perplexity')
  it('should handle API errors gracefully')
  it('should apply custom filters')
  it('should parse response correctly')
})
```

#### Example: OpenAI RAG Tests

```typescript
describe('OpenAI RAG Integration', () => {
  it('should generate embeddings')
  it('should find similar preferences')
  it('should analyze user ratings')
  it('should generate contextual responses')
})
```

### Integration Tests (`__tests__/integration/`)

Test complete user journeys:
- ✅ Multi-step workflows
- ✅ Data consistency across operations
- ✅ End-to-end scenarios

#### Example: Movie Rating Flow

```typescript
it('should complete full user journey: browse → rate → watchlist → recommendations', async () => {
  // 1. User browses movies
  // 2. User rates a movie
  // 3. User adds to watchlist
  // 4. User generates recommendations
  // ✅ All operations succeed
})
```

---

## 🔧 Writing Tests

### Using Test Utilities

Import mock data and helpers:

```typescript
import {
  mockSession,
  mockPrisma,
  mockMovie,
  mockUser,
  createNextRequest,
} from '../helpers/test-utils';
```

### Mocking NextAuth

```typescript
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

// In test
(getServerSession as jest.Mock).mockResolvedValue(mockSession);
```

### Mocking Prisma

```typescript
jest.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}));

// In test
mockPrisma.movie.findMany.mockResolvedValue([mockMovie]);
```

### Creating Mock Requests

```typescript
const request = createNextRequest('POST', 'http://localhost:3000/api/ratings', {
  movieId: 1,
  movieTitle: 'Test Movie',
  movieYear: 2024,
  rating: 'amazing',
});
```

### Testing API Responses

```typescript
const response = await POST(request);
const data = await response.json();

expect(response.status).toBe(200);
expect(data.success).toBe(true);
expect(data.rating).toEqual(mockRating);
```

---

## 📊 Coverage Reports

### Generate Coverage Report

```bash
npm test
```

Coverage report is generated in:
- **HTML**: `coverage/lcov-report/index.html`
- **Console**: Displayed after tests complete

### View HTML Coverage Report

```bash
# macOS
open coverage/lcov-report/index.html

# Linux
xdg-open coverage/lcov-report/index.html

# Windows
start coverage/lcov-report/index.html
```

### Coverage Thresholds

Defined in `jest.config.js`:

```javascript
coverageThreshold: {
  global: {
    branches: 50,
    functions: 50,
    lines: 50,
    statements: 50,
  },
}
```

Tests will **fail** if coverage falls below these thresholds.

---

## 🎯 Test Coverage by Module

### API Endpoints

| Endpoint | Coverage |
|----------|----------|
| `/api/search/ai` | ✅ Full |
| `/api/ratings` (GET, POST, DELETE) | ✅ Full |
| `/api/watchlist` (GET, POST, DELETE) | ✅ Full |
| `/api/recommendations/bulk` (GET, POST) | ✅ Full |

### Unit Tests

| Module | Coverage |
|--------|----------|
| Perplexity API Integration | ✅ Full |
| OpenAI GPT & RAG | ✅ Full |
| Embedding Generation | ✅ Full |
| Similarity Search | ✅ Full |
| Rating Analysis | ✅ Full |

### Integration Tests

| Flow | Coverage |
|------|----------|
| Complete movie rating journey | ✅ Full |
| Multiple ratings & recommendations | ✅ Full |
| Insufficient ratings handling | ✅ Full |
| Data consistency | ✅ Full |
| RAG Pipeline (end-to-end) | ✅ Full |

---

## 🔄 CI/CD Integration

### GitHub Actions Example

Create `.github/workflows/test.yml`:

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run tests
        run: npm test
        
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
```

### Pre-commit Hook

Add to `.git/hooks/pre-commit`:

```bash
#!/bin/bash

# Run tests before commit
npm test

# Fail commit if tests fail
if [ $? -ne 0 ]; then
  echo "Tests failed. Commit aborted."
  exit 1
fi
```

Make it executable:

```bash
chmod +x .git/hooks/pre-commit
```

---

## 🐛 Troubleshooting

### Common Issues

#### 1. "Cannot find module" errors

**Problem**: Import paths not resolving

**Solution**: Ensure `jest.config.js` has correct `moduleNameMapper`:

```javascript
moduleNameMapper: {
  '^@/(.*)$': '<rootDir>/$1',
}
```

#### 2. "ReferenceError: TextEncoder is not defined"

**Problem**: Missing global for jsdom environment

**Solution**: Add to `jest.setup.js`:

```javascript
global.TextEncoder = require('util').TextEncoder;
global.TextDecoder = require('util').TextDecoder;
```

#### 3. Tests timeout

**Problem**: Async operations taking too long

**Solution**: Increase timeout in test file:

```typescript
jest.setTimeout(10000); // 10 seconds
```

#### 4. Mock not working

**Problem**: Mock is not being applied

**Solution**: Ensure mock is defined **before** imports:

```typescript
// ❌ Wrong order
import { myFunction } from './my-module';
jest.mock('./my-module');

// ✅ Correct order
jest.mock('./my-module');
import { myFunction } from './my-module';
```

#### 5. Database connection errors

**Problem**: Tests trying to connect to real database

**Solution**: All database calls should be mocked. Check that `mockPrisma` is imported.

---

## 📚 Best Practices

### ✅ Do's

1. **Always mock external dependencies** (database, APIs, auth)
2. **Use descriptive test names** ("`should return 401 if user is not authenticated`")
3. **Test both success and error cases**
4. **Clear mocks between tests** (`beforeEach(() => jest.clearAllMocks())`)
5. **Keep tests isolated** (no shared state between tests)
6. **Test edge cases** (empty strings, null values, large numbers)

### ❌ Don'ts

1. **Don't test implementation details** (test behavior, not internals)
2. **Don't skip cleanup** (always clear mocks)
3. **Don't test third-party libraries** (assume they work)
4. **Don't use real database** (always mock)
5. **Don't make external API calls** (always mock)

---

## 📖 Additional Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Testing Library React](https://testing-library.com/docs/react-testing-library/intro/)
- [Next.js Testing Documentation](https://nextjs.org/docs/testing)

---

## 🎓 Example Test Template

Use this template for new API tests:

```typescript
import { POST } from '@/app/api/your-endpoint/route';
import { createNextRequest, mockSession, mockPrisma } from '../helpers/test-utils';

jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

jest.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}));

import { getServerSession } from 'next-auth';

describe('POST /api/your-endpoint', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
  });

  it('should return 401 if user is not authenticated', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);

    const request = createNextRequest('POST', 'http://localhost:3000/api/your-endpoint');
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('should process request successfully', async () => {
    // Your test implementation
  });
});
```

---

## 📞 Support

If you encounter issues:

1. Check this documentation
2. Review existing tests in `__tests__/` for examples
3. Check Jest/Testing Library documentation
4. Run tests with `--verbose` flag for detailed output

---

**Last Updated**: November 13, 2025  
**Maintained By**: CineMate Development Team

