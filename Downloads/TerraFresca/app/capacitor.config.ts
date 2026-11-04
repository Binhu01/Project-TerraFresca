import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.terrafresca.app',
  appName: 'Terra Fresca',
  webDir: 'www',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    StatusBar: { style: 'DARK', backgroundColor: '#1e3320' }
  }
};

export default config;