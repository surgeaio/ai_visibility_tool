import { google } from "googleapis";

const GSC_SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";

export class GoogleOAuthService {
  private getClient() {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI ?? `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/auth/google/callback`;
    if (!clientId?.trim() || !clientSecret?.trim()) {
      throw new Error("Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET");
    }
    return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  }

  getAuthUrl(state: string): string {
    const oauth2 = this.getClient();
    return oauth2.generateAuthUrl({
      access_type: "offline",
      scope: [GSC_SCOPE],
      state,
      prompt: "consent",
    });
  }

  async exchangeCode(code: string): Promise<{ accessToken: string; refreshToken: string; expiresAt: Date }> {
    const oauth2 = this.getClient();
    const { tokens } = await oauth2.getToken(code);
    if (!tokens.access_token) {
      throw new Error("Google OAuth did not return an access token");
    }
    const refresh = tokens.refresh_token ?? "";
    if (!refresh) {
      throw new Error("No refresh token returned — revoke app access and retry with prompt=consent");
    }
    return {
      accessToken: tokens.access_token,
      refreshToken: refresh,
      expiresAt: new Date(tokens.expiry_date ?? Date.now() + 3600_000),
    };
  }

  async refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; expiresAt: Date }> {
    const oauth2 = this.getClient();
    oauth2.setCredentials({ refresh_token: refreshToken });
    const { credentials } = await oauth2.refreshAccessToken();
    if (!credentials.access_token) {
      throw new Error("Failed to refresh Google access token");
    }
    return {
      accessToken: credentials.access_token,
      expiresAt: new Date(credentials.expiry_date ?? Date.now() + 3600_000),
    };
  }

  getAuthenticatedClient(accessToken: string) {
    const oauth2 = this.getClient();
    oauth2.setCredentials({ access_token: accessToken });
    return oauth2;
  }
}
