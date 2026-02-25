import type { ServiceDefinition, TokenResponse } from '../types.js';

export interface GoogleProfile {
  id: string;
  email: string;
  verified_email: boolean;
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
}

export const googleOAuthBase = {
  authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenUrl: 'https://oauth2.googleapis.com/token',
  revokeUrl: 'https://oauth2.googleapis.com/revoke',
  extraAuthParams: {
    access_type: 'offline',
    prompt: 'consent',
  },
};

export async function fetchGoogleProfile(
  accessToken: string
): Promise<GoogleProfile> {
  const response = await fetch(
    'https://www.googleapis.com/oauth2/v2/userinfo',
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch Google profile: ${response.statusText}`);
  }

  return response.json();
}

export const gmailService: ServiceDefinition = {
  id: 'gmail',
  name: 'Gmail',
  icon: 'mail',
  oauthConfig: {
    ...googleOAuthBase,
    scopes: [
      'https://www.googleapis.com/auth/gmail.modify',
      'https://www.googleapis.com/auth/userinfo.email',
    ],
  },
  supportsRefresh: true,
  fetchProfile: fetchGoogleProfile,
  async extractAccountId(
    _tokenResponse: TokenResponse,
    profile?: unknown
  ): Promise<string> {
    const googleProfile = profile as GoogleProfile | undefined;
    if (!googleProfile?.email) {
      throw new Error('Could not extract email from Google profile');
    }
    return googleProfile.email;
  },
  extractDisplayName(
    _tokenResponse: TokenResponse,
    profile?: unknown
  ): string | undefined {
    const googleProfile = profile as GoogleProfile | undefined;
    return googleProfile?.email;
  },
};
