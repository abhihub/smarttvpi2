import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
  ActivityIndicator,
  Alert,
  Dimensions
} from 'react-native';

const { width } = Dimensions.get('window');

export type ConnectionType = 'wifi';


interface ConnectionSelectorProps {
  onConnectionTypeSelect: (type: ConnectionType) => void;
  currentConnectionType: ConnectionType;
}

const ConnectionSelector: React.FC<ConnectionSelectorProps> = ({
  onConnectionTypeSelect,
  currentConnectionType
}) => {

  const handleWiFiSelect = () => {
    onConnectionTypeSelect('wifi');
  };





  return (
    <View style={styles.container}>
      <Text style={styles.title}>Connection Method</Text>
      
      <TouchableOpacity
        style={[
          styles.connectionOption,
          currentConnectionType === 'wifi' && styles.selectedOption
        ]}
        onPress={handleWiFiSelect}
      >
        <View style={styles.optionContent}>
          <Text style={styles.optionIcon}>📶</Text>
          <View style={styles.optionText}>
            <Text style={styles.optionTitle}>WiFi Connection</Text>
            <Text style={styles.optionDescription}>
              Connect using IP address over WiFi network
            </Text>
          </View>
        </View>
        {currentConnectionType === 'wifi' && (
          <Text style={styles.selectedIndicator}>✓</Text>
        )}
      </TouchableOpacity>


    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  connectionOption: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#e1e5e9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  selectedOption: {
    borderColor: '#007aff',
    backgroundColor: '#f0f8ff',
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  optionText: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  selectedIndicator: {
    fontSize: 20,
    color: '#007aff',
    fontWeight: 'bold',
  },
  
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    width: width - 40,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 5,
  },
  closeButtonText: {
    fontSize: 18,
    color: '#666',
  },
  scanningContainer: {
    alignItems: 'center',
    padding: 40,
  },
  scanningText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#ff3b30',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#007aff',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  deviceList: {
    maxHeight: 300,
  },
  deviceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginBottom: 8,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  deviceAddress: {
    fontSize: 14,
    color: '#666',
  },
  deviceRssi: {
    alignItems: 'center',
  },
  rssiText: {
    fontSize: 12,
    color: '#666',
  },
  signalStrength: {
    fontSize: 16,
    marginTop: 2,
  },
  refreshButton: {
    backgroundColor: '#007aff',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  refreshButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ConnectionSelector;