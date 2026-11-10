/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  provider: 'google' | 'email';
  authenticatedAt: number;
}

const AUTH_STORAGE_KEY = 'memora_auth_session';

class AuthService {
  private currentUser: AuthUser | null = null;
  private listeners: Set<(user: AuthUser | null) => void> = new Set();

  constructor() {
    this.currentUser = this.loadSession();
  }

  public subscribe(callback: (user: AuthUser | null) => void): () => void {
    this.listeners.add(callback);
    callback(this.currentUser);
    return () => this.listeners.delete(callback);
  }

  private notify() {
    this.listeners.forEach(cb => {
      try {
        cb(this.currentUser);
      } catch (e) {
        console.error('Auth listener error:', e);
      }
    });
  }

  private loadSession(): AuthUser | null {
    try {
      const saved = localStorage.getItem(AUTH_STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Could not load auth session', e);
    }
    return null;
  }

  public isAuthenticated(): boolean {
    return this.currentUser !== null;
  }

  public getUser(): AuthUser | null {
    return this.currentUser;
  }

  public async signInWithGoogle(customEmail?: string): Promise<AuthUser> {
    // Dynamic Google Sign-In with user's provided or detected email
    const email = customEmail?.trim() || 'user@example.com';
    const user: AuthUser = {
      id: 'usr-' + Math.random().toString(36).substring(2, 9),
      email: email,
      name: email.split('@')[0],
      provider: 'google',
      avatarUrl: `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(email)}`,
      authenticatedAt: Date.now()
    };

    this.currentUser = user;
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    this.notify();
    return user;
  }

  public async signInWithEmail(email: string, _password?: string): Promise<AuthUser> {
    const trimmedEmail = email.trim();
    const user: AuthUser = {
      id: 'usr-' + Math.random().toString(36).substring(2, 9),
      email: trimmedEmail,
      name: trimmedEmail.split('@')[0],
      provider: 'email',
      avatarUrl: `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(trimmedEmail)}`,
      authenticatedAt: Date.now()
    };

    this.currentUser = user;
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    this.notify();
    return user;
  }

  public signOut(): void {
    this.currentUser = null;
    localStorage.removeItem(AUTH_STORAGE_KEY);
    this.notify();
  }
}

export const authService = new AuthService();
