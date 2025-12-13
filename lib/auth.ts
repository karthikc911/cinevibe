import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { PrismaClient } from "@prisma/client";
import { compare } from "bcryptjs";

const prisma = new PrismaClient();

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
    CredentialsProvider({
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password required");
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        // User doesn't exist - specific error for signup redirect
        if (!user) {
          throw new Error("USER_NOT_FOUND");
        }

        // User exists but signed up with OAuth (no password)
        if (!user.password) {
          throw new Error("Please sign in with Google");
        }

        const isPasswordValid = await compare(credentials.password, user.password);

        if (!isPasswordValid) {
          throw new Error("Invalid password");
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      // For OAuth providers (Google), track signup method
      if (account?.provider === "google" && user.id) {
        try {
          // Check if this is a new user (no signupMethod set yet)
          const existingUser = await prisma.user.findUnique({
            where: { id: user.id },
            select: { signupMethod: true },
          });

          // If signupMethod is not set, this is a new OAuth signup
          if (existingUser && !existingUser.signupMethod) {
            await prisma.user.update({
              where: { id: user.id },
              data: { signupMethod: "oauth" },
            });
          }
        } catch (error) {
          console.error("Error tracking OAuth signup:", error);
          // Don't block sign-in if tracking fails
        }
        
        return true;
      }
      
      // For credentials, the authorize function already handles validation
      return true;
    },
    async jwt({ token, user, trigger, session }) {
      // Initial sign in
      if (user) {
        token.id = user.id;
      }
      
      // Handle session updates
      if (trigger === "update" && session) {
        token = { ...token, ...session };
      }
      
      return token;
    },
    async session({ session, token, user }) {
      // For database strategy (OAuth)
      if (user) {
        session.user.id = user.id;
      }
      // For JWT strategy (Credentials)
      if (token) {
        session.user.id = token.id as string;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      // After OAuth callback, redirect to onboarding
      // The onboarding page will check if it's already completed
      if (url.includes('/api/auth/callback/google')) {
        return `${baseUrl}/onboarding`;
      }
      // For other callbacks, use default behavior
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      else if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
  },
  session: {
    strategy: "jwt", // Using JWT for both OAuth and Credentials
  },
};

