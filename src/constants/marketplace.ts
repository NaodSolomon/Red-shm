import { Platform } from 'react-native';

export const color = {
  paper: '#FCF7EF', white: '#FFFDF8', ink: '#322320', muted: '#6D5851',
  line: '#E5D7CA', red: '#872C39', rose: '#F3E1DD', sand: '#EEDFCB',
};
export const serif = Platform.select({ android: 'serif', default: 'Georgia' });
