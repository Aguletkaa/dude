// src/constants/colors.js

export const COLORS = {
  // Backgrounds
  background: '#2D2520',           
  backgroundSecondary: '#3D3530',  
  card: '#3D3530',                 
  cardDark: '#2D2520',             
  cardLight: '#4D4540',            
  
  // Akcenty
  primary: '#A89575',              
  primaryDark: '#8B7355',         
  primaryLight: '#C9B899',         
  accent: '#C9A87C',               
  
  // Status colors
  online: '#7FB069',              
  offline: '#D45B5B',              
  warning: '#E8A13A',            
  
  // Text 
  text: '#E8DCC8',                 
  textSecondary: '#B8ACA0',        
  textMuted: '#8B7D6B',           
  textDark: '#5D4E3E',           
  
  // Borders
  border: '#4D4540',              
  borderLight: '#5D5550',         
  borderDark: '#3D3530',           
  
  // Icon backgrounds
  iconBg: '#4D4540',              
  iconBgHover: '#5D5550',          
  
  // kafelki
  tile1: '#8B7355',
  tile2: '#7A6B54',
  tile3: '#A0836C',
  tile4: '#6B5B4A',
  tile5: '#9B8570',
  tile6: '#7C6D5C',
  tile7: '#8A7B6A',
};

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