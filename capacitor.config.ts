import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.recoverywarrior.app',
  appName: 'Recovery Warrior',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: '#fef7ff',
      showSpinner: false
    }
  }
};

export default config;
