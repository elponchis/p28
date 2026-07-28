/**
 * Story 1.3/1.4: Unit tests for facade and contract surface.
 * Verifies facade exports auth, data, realtime with expected method signatures.
 * Uses mocked adapter so no real Supabase/AsyncStorage in Node (Story 1.4).
 */
const mockAuth = {
  signIn: jest
    .fn()
    .mockResolvedValue({ error: { message: 'Auth not implemented', code: 'NOT_IMPLEMENTED' } }),
  signUp: jest
    .fn()
    .mockResolvedValue({ error: { message: 'Auth not implemented', code: 'NOT_IMPLEMENTED' } }),
  checkEmailAvailable: jest.fn().mockResolvedValue({ available: true }),
  signOut: jest.fn().mockResolvedValue({}),
  getSession: jest.fn().mockResolvedValue(null),
  getCurrentUser: jest.fn().mockResolvedValue(null),
  onAuthStateChange: jest.fn().mockReturnValue(() => {}),
};
const mockData = {};
const mockRealtime = { subscribe: jest.fn(), unsubscribe: jest.fn() };

jest.mock('../adapters/supabase', () => ({
  auth: mockAuth,
  data: mockData,
  realtime: mockRealtime,
}));

import {
  auth,
  data,
  realtime,
  getUserFacingError,
  type AuthContract,
  type DataContract,
  type RealtimeContract,
  type ApiError,
  type User,
  type Session,
  type AuthStateListener,
  type RealtimeChannelId,
  type RealtimeHandlers,
} from '../index';

describe('lib/api facade', () => {
  describe('exports', () => {
    it('exports auth, data, realtime', () => {
      expect(auth).toBeDefined();
      expect(data).toBeDefined();
      expect(realtime).toBeDefined();
    });

    it('auth implements AuthContract (signIn, signUp, checkEmailAvailable, signOut, getSession, getCurrentUser, onAuthStateChange)', () => {
      expect(typeof auth.signIn).toBe('function');
      expect(typeof auth.signUp).toBe('function');
      expect(typeof auth.checkEmailAvailable).toBe('function');
      expect(typeof auth.signOut).toBe('function');
      expect(typeof auth.getSession).toBe('function');
      expect(typeof auth.getCurrentUser).toBe('function');
      expect(typeof auth.onAuthStateChange).toBe('function');
    });

    it('realtime implements RealtimeContract (subscribe, unsubscribe)', () => {
      expect(typeof realtime.subscribe).toBe('function');
      expect(typeof realtime.unsubscribe).toBe('function');
    });

    it('exports getUserFacingError helper', () => {
      expect(typeof getUserFacingError).toBe('function');
    });
  });

  describe('auth behavior (mocked adapter)', () => {
    it('auth.getSession() resolves to null when no session', async () => {
      const session = await auth.getSession();
      expect(session).toBeNull();
    });

    it('auth.signIn returns error or session', async () => {
      const result = await auth.signIn('a@b.co', 'pass');
      expect(result).toHaveProperty('error');
      expect((result as { error: ApiError }).error.code).toBe('NOT_IMPLEMENTED');
    });

    it('getUserFacingError maps NOT_IMPLEMENTED to user message', () => {
      expect(getUserFacingError({ message: '', code: 'NOT_IMPLEMENTED' })).toBe(
        'This feature is not available yet.'
      );
    });

    it('getUserFacingError returns message for other errors', () => {
      expect(getUserFacingError({ message: 'Network error' })).toBe('Network error');
    });
  });

  describe('type exports (contract types for app)', () => {
    it('contract types are usable', () => {
      const _auth: AuthContract = auth;
      const _data: DataContract = data;
      const _realtime: RealtimeContract = realtime;
      const _user: User = { id: '1', email: 'a@b.co' };
      const _session: Session = { accessToken: 't', user: _user };
      const _listener: AuthStateListener = () => {};
      const _channelId: RealtimeChannelId = 'messages:group:123';
      const _handlers: RealtimeHandlers = { onMessage: () => {} };
      expect(_auth).toBe(auth);
      expect(_data).toBe(data);
      expect(_realtime).toBe(realtime);
      expect(_user.id).toBe('1');
      expect(_session.accessToken).toBe('t');
      expect(_channelId).toBe('messages:group:123');
    });
  });
});
