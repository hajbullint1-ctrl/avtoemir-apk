import type { CapacitorConfig } from '@capacitor/cli'

/**
 * AvtoEmir native shell (Capacitor).
 * Loads the live web app so ALL data (Supabase, admin, students) stays as-is.
 * No separate backend — same Vercel + Supabase.
 */
const config: CapacitorConfig = {
  appId: 'com.avtoemir.app',
  appName: 'AvtoEmir',
  webDir: 'public',
  server: {
    // Production site — full app + admin + Supabase
    url: 'https://avtoemir-apk.vercel.app',
    cleartext: false,
    androidScheme: 'https',
  },
  android: {
    allowMixedContent: false,
    backgroundColor: '#1d4fd8',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: '#1d4fd8',
      showSpinner: false,
      androidScaleType: 'CENTER',
    },
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#1d4fd8',
    },
    Keyboard: {
      resize: 'body',
    },
  },
}

export default config
