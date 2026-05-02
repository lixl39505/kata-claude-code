import '@testing-library/jest-dom'

// Mock Next.js server modules to avoid test environment issues
jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((body, init) => ({
      status: init?.status || 200,
      json: async () => body,
    })),
  },
  NextRequest: class MockNextRequest {},
}));

jest.mock('next/navigation', () => ({
  redirect: jest.fn(),
  revalidatePath: jest.fn(),
}));
