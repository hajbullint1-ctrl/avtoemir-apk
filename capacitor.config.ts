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
    // ?apk=17 forces Android WebView to ignore old cached HTML/JS after sync fixes
    url: 'https://avtoemir-apk.vercel.app/?apk=17',
    cleartext: false,
    androidScheme: 'https',
    allowNavigation: ['avtoemir-apk.vercel.app', '*.supabase.co'],
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
