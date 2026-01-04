// src/constants/colors.js
// Dark Theme - Consistent with Login Screen

export const COLORS = {
  // Backgrounds - Ciemne (jak login)
  background: '#2D2520',           // Bardzo ciemny brąz (główne tło)
  backgroundSecondary: '#3D3530',  // Trochę jaśniejsze (karty)
  card: '#3D3530',                 // Karty
  cardDark: '#2D2520',             // Ciemniejsze elementy
  cardLight: '#4D4540',            // Jaśniejsze karty
  
  // Akcenty - Beżowe (NIE złote!)
  primary: '#A89575',              // Beżowy akcent
  primaryDark: '#8B7355',          // Ciemniejszy beż
  primaryLight: '#C9B899',         // Jaśniejszy beż
  accent: '#C9A87C',               // Beżowy
  
  // Status colors
  online: '#7FB069',               // Przytłumiony zielony
  offline: '#D45B5B',              // Przytłumiony czerwony
  warning: '#E8A13A',              // Przytłumiony pomarańczowy
  
  // Text - Jasne na ciemnym tle
  text: '#E8DCC8',                 // Jasny beż (główny tekst)
  textSecondary: '#B8ACA0',        // Przygaszony jasny
  textMuted: '#8B7D6B',            // Bardziej przygaszony
  textDark: '#5D4E3E',             // Ciemny tekst (dla jasnych tła)
  
  // Borders
  border: '#4D4540',               // Obramowania
  borderLight: '#5D5550',          // Jasne obramowania
  borderDark: '#3D3530',           // Ciemne obramowania
  
  // Icon backgrounds
  iconBg: '#4D4540',               // Tło dla ikon
  iconBgHover: '#5D5550',          // Hover state
  
  // Tile colors (dla kafelków - różne odcienie)
  tile1: '#8B7355',
  tile2: '#7A6B54',
  tile3: '#A0836C',
  tile4: '#6B5B4A',
  tile5: '#9B8570',
  tile6: '#7C6D5C',
  tile7: '#8A7B6A',
};

// Helper functions
export const getStatusColor = (status) => {
  switch (status?.toLowerCase()) {
    case 'online':
      return COLORS.online;
    case 'offline':
      return COLORS.offline;
    case 'warning':
      return COLORS.warning;
    default:
      return COLORS.textMuted;
  }
};

export const getSeverityColor = (severity) => {
  switch (severity?.toLowerCase()) {
    case 'critical':
      return COLORS.offline;
    case 'warning':
      return COLORS.warning;
    case 'info':
      return COLORS.online;
    default:
      return COLORS.textMuted;
  }
};

export default COLORS;