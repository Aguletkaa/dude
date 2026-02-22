// src/screens/MapScreen.js
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator, ScrollView,
  TouchableOpacity, Dimensions, RefreshControl,
} from 'react-native';
import Svg, { Circle, Rect, Text as SvgText, Line, G } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialIcons';
import COLORS from '../constants/colors';

const API_URL = 'http://10.0.2.2:8000';
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MAIN_MAP_ID = 10159;

const MapScreen = ({ navigation }) => {
  const [allMapData, setAllMapData] = useState(null);
  const [currentMapId, setCurrentMapId] = useState(MAIN_MAP_ID);
  const [mapStack, setMapStack] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [scale, setScale] = useState(0.4);
  const [selectedNode, setSelectedNode] = useState(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token') ||
                    await AsyncStorage.getItem('access_token');

      const res = await fetch(`${API_URL}/api/map/layout`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const json = await res.json();
      setAllMapData(json);
    } catch (error) {
      console.error('Error loading map:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getCurrentMapView = () => {
    if (!allMapData?.maps) return null;
    const mapInfo = allMapData.maps[String(currentMapId)];
    if (!mapInfo?.items?.length) return null;

    const padding = 80;
    const xs = mapInfo.items.map(i => i.x);
    const ys = mapInfo.items.map(i => i.y);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);

    const items = mapInfo.items.map(item => ({
      ...item,
      x: item.x - minX + padding,
      y: item.y - minY + padding,
    }));

    const maxX = Math.max(...items.map(i => i.x)) + padding * 2;
    const maxY = Math.max(...items.map(i => i.y)) + padding * 2;

    const byId = {};
    items.forEach(item => { byId[item.object_id] = item; });

    const connections = (mapInfo.connections || [])
      .map(c => ({ from: byId[c.from_id], to: byId[c.to_id] }))
      .filter(c => c.from && c.to);

    const devs = items.filter(i => !i.is_submap);
    return {
      items, connections,
      canvasWidth: maxX, canvasHeight: maxY,
      mapName: mapInfo.name || 'Mapa',
      stats: {
        total: items.length,
        devices: devs.length,
        online: devs.filter(i => i.status === 'online').length,
        offline: devs.filter(i => i.status === 'offline').length,
        warning: devs.filter(i => i.status === 'warning').length,
        unknown: devs.filter(i => !['online','offline','warning'].includes(i.status)).length,
        submaps: items.filter(i => i.is_submap).length,
      },
    };
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'online': return COLORS.online;
      case 'offline': return COLORS.offline;
      case 'warning': return COLORS.warning;
      case 'submap': return '#5B88BD';
      default: return COLORS.textMuted;
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'online': return 'Online';
      case 'offline': return 'Offline';
      case 'warning': return 'Warning';
      case 'submap': return 'Podmapa';
      default: return 'Nieznany';
    }
  };

  const openSubmap = (item) => {
    if (allMapData?.maps?.[String(item.item_id)]) {
      setMapStack(prev => [...prev, { id: currentMapId, name: getCurrentMapView()?.mapName || 'Mapa' }]);
      setCurrentMapId(item.item_id);
      setSelectedNode(null);
      setScale(0.5);
    }
  };

  const goBack = () => {
    if (mapStack.length > 0) {
      const prev = mapStack[mapStack.length - 1];
      setMapStack(s => s.slice(0, -1));
      setCurrentMapId(prev.id);
      setSelectedNode(null);
      setScale(prev.id === MAIN_MAP_ID ? 0.4 : 0.5);
    }
  };

  const goToMainMap = () => {
    setMapStack([]);
    setCurrentMapId(MAIN_MAP_ID);
    setSelectedNode(null);
    setScale(0.4);
  };

  const zoomIn = () => setScale(p => Math.min(p + 0.1, 1.5));
  const zoomOut = () => setScale(p => Math.max(p - 0.1, 0.15));
  const resetZoom = () => setScale(currentMapId === MAIN_MAP_ID ? 0.4 : 0.5);
  const onRefresh = () => { setRefreshing(true); loadData(); };


  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Ładowanie mapy sieci...</Text>
      </View>
    );
  }

  const mapView = getCurrentMapView();
  if (!mapView) {
    return (
      <View style={styles.emptyContainer}>
        <Icon name="map" size={64} color={COLORS.textMuted} />
        <Text style={styles.emptyText}>Brak danych mapy</Text>
        <Text style={styles.emptySubtext}>Sprawdź połączenie z backendem</Text>
        {currentMapId !== MAIN_MAP_ID && (
          <TouchableOpacity style={styles.retryBtn} onPress={goBack}>
            <Text style={styles.retryText}>Wróć</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={[styles.retryBtn, { marginTop: 10 }]} onPress={loadData}>
          <Text style={styles.retryText}>Odśwież</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const svgW = mapView.canvasWidth * scale;
  const svgH = mapView.canvasHeight * scale;
  const isSub = currentMapId !== MAIN_MAP_ID;

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerLeft}>
            {isSub && (
              <TouchableOpacity style={styles.backButton} onPress={goBack}>
                <Icon name="arrow-back" size={22} color={COLORS.text} />
              </TouchableOpacity>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle} numberOfLines={1}>
                {isSub ? mapView.mapName : 'Mapa sieci'}
              </Text>
              <Text style={styles.headerSubtitle}>
                {mapView.stats.devices} urządzeń{mapView.stats.submaps > 0 ? ` • ${mapView.stats.submaps} podmap` : ''}
              </Text>
            </View>
          </View>
          <TouchableOpacity style={styles.refreshButton} onPress={loadData}>
            <Icon name="refresh" size={20} color={COLORS.text} />
          </TouchableOpacity>
        </View>

        {/* Breadcrumb */}
        {isSub && (
          <View style={styles.breadcrumb}>
            <TouchableOpacity onPress={goToMainMap}>
              <Text style={styles.breadcrumbLink}>Główna</Text>
            </TouchableOpacity>
            {mapStack.map((item, idx) => (
              <React.Fragment key={idx}>
                <Icon name="chevron-right" size={14} color={COLORS.textMuted} />
                <TouchableOpacity onPress={() => {
                  setMapStack(s => s.slice(0, idx));
                  setCurrentMapId(mapStack[idx].id);
                  setSelectedNode(null);
                }}>
                  <Text style={styles.breadcrumbLink} numberOfLines={1}>
                    {item.name.length > 12 ? item.name.substring(0, 12) + '…' : item.name}
                  </Text>
                </TouchableOpacity>
              </React.Fragment>
            ))}
            <Icon name="chevron-right" size={14} color={COLORS.textMuted} />
            <Text style={styles.breadcrumbCurrent} numberOfLines={1}>
              {mapView.mapName.length > 12 ? mapView.mapName.substring(0, 12) + '…' : mapView.mapName}
            </Text>
          </View>
        )}

        {/* Status pills */}
        <View style={styles.statusRow}>
          {mapView.stats.online > 0 && (
            <View style={[styles.statusPill, { backgroundColor: 'rgba(127,176,105,0.15)' }]}>
              <View style={[styles.statusDot, { backgroundColor: COLORS.online }]} />
              <Text style={[styles.statusPillText, { color: COLORS.online }]}>{mapView.stats.online} online</Text>
            </View>
          )}
          {mapView.stats.offline > 0 && (
            <View style={[styles.statusPill, { backgroundColor: 'rgba(212,91,91,0.15)' }]}>
              <View style={[styles.statusDot, { backgroundColor: COLORS.offline }]} />
              <Text style={[styles.statusPillText, { color: COLORS.offline }]}>{mapView.stats.offline} offline</Text>
            </View>
          )}
          {mapView.stats.warning > 0 && (
            <View style={[styles.statusPill, { backgroundColor: 'rgba(232,161,58,0.15)' }]}>
              <View style={[styles.statusDot, { backgroundColor: COLORS.warning }]} />
              <Text style={[styles.statusPillText, { color: COLORS.warning }]}>{mapView.stats.warning} warning</Text>
            </View>
          )}
          {mapView.stats.submaps > 0 && (
            <View style={[styles.statusPill, { backgroundColor: 'rgba(91,136,189,0.15)' }]}>
              <View style={[styles.statusDot, { backgroundColor: '#5B88BD' }]} />
              <Text style={[styles.statusPillText, { color: '#5B88BD' }]}>{mapView.stats.submaps} podmap</Text>
            </View>
          )}
        </View>
      </View>

      {/* ZOOM */}
      <View style={styles.controls}>
        <TouchableOpacity style={styles.controlBtn} onPress={zoomOut}>
          <Icon name="remove" size={20} color={COLORS.text} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.controlBtnWide} onPress={resetZoom}>
          <Text style={styles.scaleText}>{Math.round(scale * 100)}%</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.controlBtn} onPress={zoomIn}>
          <Icon name="add" size={20} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      {/* MAPA SVG */}
      <ScrollView
        style={styles.mapContainer}
        contentContainerStyle={{ width: Math.max(svgW, SCREEN_WIDTH), height: svgH + 20 }}
        horizontal showsHorizontalScrollIndicator
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <ScrollView nestedScrollEnabled showsVerticalScrollIndicator>
          <Svg width={svgW} height={svgH}>
            {/* Siatka */}
            {Array.from({ length: Math.ceil(svgW / (100 * scale)) + 1 }).map((_, i) => (
              <Line key={`gv${i}`} x1={i*100*scale} y1={0} x2={i*100*scale} y2={svgH}
                stroke={COLORS.border} strokeWidth={0.5} opacity={0.2} />
            ))}
            {Array.from({ length: Math.ceil(svgH / (100 * scale)) + 1 }).map((_, i) => (
              <Line key={`gh${i}`} x1={0} y1={i*100*scale} x2={svgW} y2={i*100*scale}
                stroke={COLORS.border} strokeWidth={0.5} opacity={0.2} />
            ))}

            {/* Połączenia */}
            {mapView.connections.map((conn, i) => {
              const bad = conn.to.status === 'offline' || conn.from.status === 'offline';
              return (
                <Line key={`c${i}`}
                  x1={conn.from.x*scale} y1={conn.from.y*scale}
                  x2={conn.to.x*scale} y2={conn.to.y*scale}
                  stroke={bad ? COLORS.offline : 'rgba(168,149,117,0.4)'}
                  strokeWidth={Math.max(2*scale, 1)}
                  strokeDasharray={bad ? `${6*scale},${4*scale}` : '0'}
                  opacity={bad ? 0.8 : 0.5}
                />
              );
            })}

            {/* Węzły */}
            {mapView.items.map((item) => {
              const isSm = item.is_submap;
              const sz = isSm ? 48 : 32;
              const color = getStatusColor(item.status);
              const ss = sz * scale;
              const sel = selectedNode?.object_id === item.object_id;
              const cx = item.x * scale;
              const cy = item.y * scale;

              return (
                <G key={`n${item.object_id}`}>
                  {/* Pierścień zaznaczenia / offline */}
                  {(sel || item.status === 'offline') && (
                    <Circle cx={cx} cy={cy}
                      r={ss/2 + (sel ? 8 : 5)*scale}
                      fill="none"
                      stroke={sel ? COLORS.primary : COLORS.offline}
                      strokeWidth={sel ? 3*scale : 2*scale}
                      opacity={sel ? 0.9 : 0.4}
                      strokeDasharray={sel ? '0' : `${4*scale},${3*scale}`}
                    />
                  )}

                  {isSm ? (
                    <>
                      <Rect
                        x={cx - ss*0.7} y={cy - ss*0.45}
                        width={ss*1.4} height={ss*0.9}
                        rx={8*scale} fill={color}
                        stroke="rgba(255,255,255,0.25)" strokeWidth={1.5*scale}
                        onPress={() => setSelectedNode(item)}
                      />
                      {scale > 0.3 && (
                        <SvgText x={cx} y={cy+4*scale}
                          fontSize={Math.max(14*scale, 8)}
                          fill="white" textAnchor="middle" fontWeight="bold"
                          onPress={() => setSelectedNode(item)}
                        >▣</SvgText>
                      )}
                    </>
                  ) : (
                    <Circle cx={cx} cy={cy} r={ss/2}
                      fill={color}
                      stroke={sel ? 'white' : 'rgba(255,255,255,0.15)'}
                      strokeWidth={sel ? 2*scale : 1*scale}
                      onPress={() => setSelectedNode(item)}
                    />
                  )}

                  {scale > 0.25 && (
                    <SvgText x={cx} y={cy + (sz/2+14)*scale}
                      fontSize={Math.max(10*scale, 7)}
                      fill={COLORS.text} textAnchor="middle" fontWeight="600"
                      onPress={() => setSelectedNode(item)}
                    >{item.name.length > 24 ? item.name.substring(0,24)+'…' : item.name}</SvgText>
                  )}
                  {scale > 0.4 && item.ip ? (
                    <SvgText x={cx} y={cy + (sz/2+26)*scale}
                      fontSize={Math.max(8*scale, 6)}
                      fill={COLORS.textSecondary} textAnchor="middle"
                    >{item.ip}</SvgText>
                  ) : null}
                </G>
              );
            })}
          </Svg>
        </ScrollView>
      </ScrollView>

      {/* INFO PANEL */}
      {selectedNode && (
        <View style={styles.infoPanel}>
          <View style={styles.ipHeader}>
            <View style={[styles.ipDot, { backgroundColor: getStatusColor(selectedNode.status) }]} />
            <View style={styles.ipTitleBlock}>
              <Text style={styles.ipName} numberOfLines={1}>{selectedNode.name}</Text>
              <Text style={styles.ipIP}>
                {selectedNode.ip || (selectedNode.is_submap ? 'Podmapa sieci' : 'Brak IP')}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setSelectedNode(null)}>
              <Icon name="close" size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.ipMeta}>
            <View style={styles.ipMetaItem}>
              <Text style={styles.ipLabel}>STATUS</Text>
              <Text style={[styles.ipValue, { color: getStatusColor(selectedNode.status) }]}>
                {getStatusLabel(selectedNode.status)}
              </Text>
            </View>
            <View style={styles.ipMetaItem}>
              <Text style={styles.ipLabel}>TYP</Text>
              <Text style={styles.ipValue}>
                {selectedNode.is_submap ? 'Podmapa' : 'Urządzenie'}
              </Text>
            </View>
          </View>

          {selectedNode.is_submap ? (
            <TouchableOpacity style={styles.ipButton} onPress={() => openSubmap(selectedNode)}>
              <Icon name="folder-open" size={18} color={COLORS.text} />
              <Text style={styles.ipButtonText}>Otwórz podmapę</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.ipButton} onPress={() => {
              navigation.navigate('DeviceDetail', { deviceId: selectedNode.item_id });
              setSelectedNode(null);
            }}>
              <Icon name="open-in-new" size={18} color={COLORS.text} />
              <Text style={styles.ipButtonText}>Szczegóły urządzenia</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* LEGENDA */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: COLORS.online }]} />
          <Text style={styles.legendText}>Online</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: COLORS.offline }]} />
          <Text style={styles.legendText}>Offline</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: COLORS.warning }]} />
          <Text style={styles.legendText}>Warning</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendSquare, { backgroundColor: '#5B88BD' }]} />
          <Text style={styles.legendText}>Podmapa</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  loadingText: { marginTop: 16, fontSize: 14, color: COLORS.textSecondary },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background, padding: 40 },
  emptyText: { fontSize: 18, color: COLORS.text, marginTop: 16, fontWeight: '600' },
  emptySubtext: { fontSize: 14, color: COLORS.textSecondary, marginTop: 8 },
  retryBtn: { marginTop: 20, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8, backgroundColor: COLORS.primary },
  retryText: { color: COLORS.text, fontWeight: '600' },
  header: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10, backgroundColor: COLORS.backgroundSecondary, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 10 },
  backButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border },
  headerTitle: { fontSize: 22, fontWeight: '700', color: COLORS.text, letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 12, color: COLORS.textSecondary, marginTop: 1 },
  refreshButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border },
  breadcrumb: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 2 },
  breadcrumbLink: { fontSize: 12, color: COLORS.primary, fontWeight: '600' },
  breadcrumbCurrent: { fontSize: 12, color: COLORS.text, fontWeight: '700' },
  statusRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  statusPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 16, gap: 5 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusPillText: { fontSize: 12, fontWeight: '700' },
  controls: { flexDirection: 'row', justifyContent: 'center', paddingVertical: 6, paddingHorizontal: 16, gap: 8, backgroundColor: COLORS.backgroundSecondary },
  controlBtn: { width: 40, height: 32, borderRadius: 8, backgroundColor: COLORS.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border },
  controlBtnWide: { paddingHorizontal: 14, height: 32, borderRadius: 8, backgroundColor: COLORS.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border },
  scaleText: { fontSize: 12, fontWeight: '700', color: COLORS.text },
  mapContainer: { flex: 1, backgroundColor: COLORS.background },
  infoPanel: { position: 'absolute', bottom: 52, left: 12, right: 12, backgroundColor: COLORS.backgroundSecondary, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: COLORS.border, elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.3, shadowRadius: 12 },
  ipHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  ipDot: { width: 14, height: 14, borderRadius: 7 },
  ipTitleBlock: { flex: 1 },
  ipName: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  ipIP: { fontSize: 12, color: COLORS.textSecondary, fontFamily: 'monospace', marginTop: 1 },
  ipMeta: { flexDirection: 'row', gap: 16, marginBottom: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: COLORS.border },
  ipMetaItem: { flex: 1 },
  ipLabel: { fontSize: 10, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 },
  ipValue: { fontSize: 13, fontWeight: '600', color: COLORS.text },
  ipButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 10, borderRadius: 10, backgroundColor: COLORS.primary },
  ipButtonText: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  legend: { flexDirection: 'row', justifyContent: 'center', paddingVertical: 8, paddingHorizontal: 16, gap: 14, backgroundColor: COLORS.backgroundSecondary, borderTopWidth: 1, borderTopColor: COLORS.border },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 9, height: 9, borderRadius: 5 },
  legendSquare: { width: 9, height: 9, borderRadius: 2 },
  legendText: { fontSize: 11, color: COLORS.textSecondary, fontWeight: '500' },
});

export default MapScreen;