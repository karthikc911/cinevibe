import { prisma } from "@/lib/prisma";

// Interface for mobile user
export interface MobileUser {
  id: string;
  email: string;
  name: string | null;
}

/**
 * Validate a mobile token and return the user if valid
 * @param authHeader The Authorization header value (e.g., "Bearer token123")
 * @returns The user object if valid, null otherwise
 */
export async function validateMobileToken(authHeader: string | null): Promise<MobileUser | null> {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.replace("Bearer ", "");
  
  if (!token) {
    return null;
  }

  try {
    // Find user with this mobile token
    const user = await prisma.user.findFirst({
      where: { mobileToken: token },
      select: {
        id: true,
        email: true,
        name: true,
      },
    });

    if (!user || !user.email) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
    };
  } catch (error) {
    console.error("[MOBILE_AUTH_ERROR]", error);
    return null;
  }
}

/**
 * Get the current user from either Next.js session or mobile token
 * This allows API routes to work with both web and mobile apps
 */
export async function getCurrentUser(
  session: { user?: { email?: string | null } } | null,
  authHeader: string | null
): Promise<MobileUser | null> {
  // First try Next.js session (for web)
  if (session?.user?.email) {
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        email: true,
        name: true,
      },
    });
    
    if (user && user.email) {
      return {
        id: user.id,
        email: user.email,
        name: user.name,
      };
    }
  }

  // Then try mobile token
  return validateMobileToken(authHeader);
}

