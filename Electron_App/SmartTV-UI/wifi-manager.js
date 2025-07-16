const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const execAsync = promisify(exec);

class WiFiManager {
    constructor() {
        this.isAPActive = false;
        this.isConnecting = false;
        this.currentNetwork = null;
        this.credentialsReceived = false;
        this.pendingCredentials = null;
        this.isSetupMode = false;
        
        // Configuration
        this.AP_SSID = 'SmartTV-Setup';
        this.AP_IP = '192.168.4.1';
        this.AP_INTERFACE = 'wlan0';
        this.WPA_SUPPLICANT_CONF = '/etc/wpa_supplicant/wpa_supplicant.conf';
        this.HOSTAPD_CONF = '/tmp/hostapd.conf';
        this.DNSMASQ_CONF = '/tmp/dnsmasq.conf';
    }

    // Check if WiFi is already connected
    async isWiFiConnected() {
        try {
            const { stdout } = await execAsync('iwconfig wlan0 | grep "Access Point"');
            return stdout.includes('Access Point:') && !stdout.includes('Not-Associated');
        } catch (error) {
            console.error('Error checking WiFi status:', error);
            return false;
        }
    }

    // Get current WiFi network info
    async getCurrentNetwork() {
        try {
            const { stdout } = await execAsync('iwconfig wlan0');
            const ssidMatch = stdout.match(/ESSID:"([^"]+)"/);
            const qualityMatch = stdout.match(/Quality=(\d+\/\d+)/);
            
            if (ssidMatch) {
                return {
                    ssid: ssidMatch[1],
                    quality: qualityMatch ? qualityMatch[1] : 'Unknown',
                    connected: true
                };
            }
            return null;
        } catch (error) {
            console.error('Error getting current network:', error);
            return null;
        }
    }

    // Start soft AP mode
    async startSoftAP() {
        if (this.isAPActive) {
            console.log('Soft AP already active');
            return true;
        }

        try {
            console.log('Starting soft AP setup...');
            
            // Stop any existing network connections
            await this.stopNetworkServices();
            
            // Create hostapd configuration
            await this.createHostapdConfig();
            
            // Create dnsmasq configuration
            await this.createDnsmasqConfig();
            
            // Configure network interface
            await this.configureAPInterface();
            
            // Start hostapd
            await this.startHostapd();
            
            // Start dnsmasq (DHCP server)
            await this.startDnsmasq();
            
            // Start web server for configuration
            await this.startWebServer();
            
            this.isAPActive = true;
            console.log('✅ Soft AP started successfully');
            console.log(`📡 Network: ${this.AP_SSID}`);
            console.log(`🌐 Setup URL: http://${this.AP_IP}`);
            
            return true;
            
        } catch (error) {
            console.error('❌ Failed to start soft AP:', error);
            await this.stopSoftAP(); // Cleanup on failure
            return false;
        }
    }

    // Stop soft AP mode
    async stopSoftAP() {
        if (!this.isAPActive) {
            console.log('Soft AP not active');
            return true;
        }

        try {
            console.log('Stopping soft AP...');
            
            // Stop services
            await this.stopWebServer();
            await this.stopDnsmasq();
            await this.stopHostapd();
            
            // Reset network interface
            await this.resetNetworkInterface();
            
            this.isAPActive = false;
            console.log('✅ Soft AP stopped successfully');
            
            return true;
            
        } catch (error) {
            console.error('❌ Failed to stop soft AP:', error);
            return false;
        }
    }

    // Create hostapd configuration
    async createHostapdConfig() {
        const config = `
interface=${this.AP_INTERFACE}
driver=nl80211
ssid=${this.AP_SSID}
hw_mode=g
channel=7
wmm_enabled=0
macaddr_acl=0
auth_algs=1
ignore_broadcast_ssid=0
wpa=0
`;
        
        await fs.promises.writeFile(this.HOSTAPD_CONF, config.trim());
        console.log('Created hostapd configuration');
    }

    // Create dnsmasq configuration
    async createDnsmasqConfig() {
        const config = `
interface=${this.AP_INTERFACE}
dhcp-range=192.168.4.2,192.168.4.20,255.255.255.0,24h
address=/#/192.168.4.1
`;
        
        await fs.promises.writeFile(this.DNSMASQ_CONF, config.trim());
        console.log('Created dnsmasq configuration');
    }

    // Configure AP network interface
    async configureAPInterface() {
        try {
            // Bring down interface
            await execAsync(`sudo ip link set ${this.AP_INTERFACE} down`);
            
            // Set static IP
            await execAsync(`sudo ip addr flush dev ${this.AP_INTERFACE}`);
            await execAsync(`sudo ip addr add ${this.AP_IP}/24 dev ${this.AP_INTERFACE}`);
            
            // Bring up interface
            await execAsync(`sudo ip link set ${this.AP_INTERFACE} up`);
            
            console.log('Configured AP interface');
        } catch (error) {
            console.error('Error configuring AP interface:', error);
            throw error;
        }
    }

    // Start hostapd
    async startHostapd() {
        try {
            // Start hostapd in background
            exec(`sudo hostapd ${this.HOSTAPD_CONF}`, (error, stdout, stderr) => {
                if (error) {
                    console.error('Hostapd error:', error);
                } else {
                    console.log('Hostapd started');
                }
            });
            
            // Wait for hostapd to initialize
            await new Promise(resolve => setTimeout(resolve, 3000));
            
        } catch (error) {
            console.error('Error starting hostapd:', error);
            throw error;
        }
    }

    // Start dnsmasq
    async startDnsmasq() {
        try {
            await execAsync(`sudo dnsmasq -C ${this.DNSMASQ_CONF}`);
            console.log('Started dnsmasq');
        } catch (error) {
            console.error('Error starting dnsmasq:', error);
            throw error;
        }
    }

    // Start web server for configuration
    async startWebServer() {
        const express = require('express');
        const app = express();
        
        app.use(express.static(__dirname));
        app.use(express.json());
        
        // Serve the WiFi credentials page
        app.get('/', (req, res) => {
            res.sendFile(path.join(__dirname, 'wifi-credentials.html'));
        });
        
        // Handle WiFi configuration
        app.post('/api/wifi-connect', async (req, res) => {
            try {
                const { ssid, password, security, hidden } = req.body;
                
                console.log('Received WiFi credentials:', { ssid, security, hidden });
                
                this.pendingCredentials = { ssid, password, security, hidden };
                this.credentialsReceived = true;
                
                res.json({ success: true, message: 'Credentials received' });
                
                // Start connection process
                setTimeout(() => {
                    this.connectToWiFi(this.pendingCredentials);
                }, 2000);
                
            } catch (error) {
                console.error('Error processing WiFi credentials:', error);
                res.status(500).json({ success: false, error: error.message });
            }
        });
        
        // Get available networks
        app.get('/api/networks', async (req, res) => {
            try {
                const networks = await this.scanNetworks();
                res.json(networks);
            } catch (error) {
                console.error('Error scanning networks:', error);
                res.status(500).json({ error: 'Failed to scan networks' });
            }
        });
        
        this.webServer = app.listen(80, () => {
            console.log('Web server started on port 80');
        });
    }

    // Stop web server
    async stopWebServer() {
        if (this.webServer) {
            this.webServer.close();
            console.log('Web server stopped');
        }
    }

    // Stop network services
    async stopNetworkServices() {
        try {
            await execAsync('sudo pkill hostapd || true');
            await execAsync('sudo pkill dnsmasq || true');
            await execAsync('sudo systemctl stop wpa_supplicant || true');
            console.log('Stopped network services');
        } catch (error) {
            console.error('Error stopping network services:', error);
        }
    }

    // Stop hostapd
    async stopHostapd() {
        try {
            await execAsync('sudo pkill hostapd || true');
            console.log('Stopped hostapd');
        } catch (error) {
            console.error('Error stopping hostapd:', error);
        }
    }

    // Stop dnsmasq
    async stopDnsmasq() {
        try {
            await execAsync('sudo pkill dnsmasq || true');
            console.log('Stopped dnsmasq');
        } catch (error) {
            console.error('Error stopping dnsmasq:', error);
        }
    }

    // Reset network interface
    async resetNetworkInterface() {
        try {
            await execAsync(`sudo ip addr flush dev ${this.AP_INTERFACE}`);
            await execAsync(`sudo ip link set ${this.AP_INTERFACE} down`);
            await execAsync(`sudo ip link set ${this.AP_INTERFACE} up`);
            console.log('Reset network interface');
        } catch (error) {
            console.error('Error resetting network interface:', error);
        }
    }

    // Scan for available networks
    async scanNetworks() {
        try {
            const { stdout } = await execAsync('sudo iwlist wlan0 scan');
            const networks = this.parseNetworkScan(stdout);
            return networks;
        } catch (error) {
            console.error('Error scanning networks:', error);
            return [];
        }
    }

    // Parse network scan results
    parseNetworkScan(scanOutput) {
        const networks = [];
        const cells = scanOutput.split('Cell ');
        
        for (const cell of cells) {
            if (!cell.includes('ESSID:')) continue;
            
            const ssidMatch = cell.match(/ESSID:"([^"]+)"/);
            const qualityMatch = cell.match(/Quality=(\d+)\/(\d+)/);
            const encryptionMatch = cell.match(/Encryption key:(on|off)/);
            const wpaMatch = cell.match(/WPA/);
            
            if (ssidMatch && ssidMatch[1]) {
                let security = 'Open';
                if (encryptionMatch && encryptionMatch[1] === 'on') {
                    security = wpaMatch ? 'WPA2' : 'WEP';
                }
                
                let signal = 'poor';
                if (qualityMatch) {
                    const quality = parseInt(qualityMatch[1]) / parseInt(qualityMatch[2]);
                    if (quality > 0.8) signal = 'excellent';
                    else if (quality > 0.6) signal = 'good';
                    else if (quality > 0.4) signal = 'fair';
                }
                
                networks.push({
                    ssid: ssidMatch[1],
                    security,
                    signal
                });
            }
        }
        
        return networks;
    }

    // Connect to WiFi network
    async connectToWiFi(credentials) {
        if (this.isConnecting) {
            console.log('Already connecting to WiFi');
            return false;
        }

        this.isConnecting = true;
        
        try {
            console.log('Connecting to WiFi:', credentials.ssid);
            
            // Stop soft AP
            await this.stopSoftAP();
            
            // Create wpa_supplicant configuration
            await this.createWpaSupplicantConfig(credentials);
            
            // Start wpa_supplicant
            await this.startWpaSupplicant();
            
            // Wait for connection
            const connected = await this.waitForConnection(30000); // 30 second timeout
            
            if (connected) {
                this.currentNetwork = credentials;
                console.log('✅ Connected to WiFi successfully');
                return true;
            } else {
                console.log('❌ Failed to connect to WiFi');
                return false;
            }
            
        } catch (error) {
            console.error('❌ WiFi connection error:', error);
            return false;
        } finally {
            this.isConnecting = false;
        }
    }

    // Create wpa_supplicant configuration
    async createWpaSupplicantConfig(credentials) {
        const { ssid, password, security, hidden } = credentials;
        
        let config = `
ctrl_interface=DIR=/var/run/wpa_supplicant GROUP=netdev
update_config=1
country=US

network={
    ssid="${ssid}"
    scan_ssid=${hidden ? 1 : 0}
`;

        if (security === 'OPEN') {
            config += `    key_mgmt=NONE\n`;
        } else if (security === 'WEP') {
            config += `    key_mgmt=NONE\n    wep_key0="${password}"\n`;
        } else {
            config += `    psk="${password}"\n`;
        }

        config += `}\n`;

        await fs.promises.writeFile(this.WPA_SUPPLICANT_CONF, config.trim());
        console.log('Created wpa_supplicant configuration');
    }

    // Start wpa_supplicant
    async startWpaSupplicant() {
        try {
            await execAsync('sudo systemctl stop wpa_supplicant || true');
            await execAsync(`sudo wpa_supplicant -B -i ${this.AP_INTERFACE} -c ${this.WPA_SUPPLICANT_CONF}`);
            await execAsync('sudo dhcpcd wlan0');
            console.log('Started wpa_supplicant');
        } catch (error) {
            console.error('Error starting wpa_supplicant:', error);
            throw error;
        }
    }

    // Wait for WiFi connection
    async waitForConnection(timeout = 30000) {
        const startTime = Date.now();
        
        while (Date.now() - startTime < timeout) {
            const connected = await this.isWiFiConnected();
            if (connected) {
                return true;
            }
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        return false;
    }

    // Check if credentials have been received
    hasCredentials() {
        return this.credentialsReceived;
    }

    // Get pending credentials
    getPendingCredentials() {
        return this.pendingCredentials;
    }

    // Reset credentials state
    resetCredentials() {
        this.credentialsReceived = false;
        this.pendingCredentials = null;
    }

    // Start WiFi setup mode (both QR scanning and soft AP)
    async startSetupMode() {
        if (this.isSetupMode) {
            console.log('Setup mode already active');
            return true;
        }

        console.log('🚀 Starting WiFi setup mode (parallel QR scanning and soft AP)');
        this.isSetupMode = true;

        try {
            // Start soft AP in background
            const apPromise = this.startSoftAP();
            
            // QR scanning is handled by the renderer process
            // The soft AP will handle credential submission
            
            console.log('✅ WiFi setup mode started successfully');
            return true;
            
        } catch (error) {
            console.error('❌ Failed to start WiFi setup mode:', error);
            this.isSetupMode = false;
            return false;
        }
    }

    // Stop WiFi setup mode
    async stopSetupMode() {
        if (!this.isSetupMode) {
            console.log('Setup mode not active');
            return true;
        }

        console.log('🛑 Stopping WiFi setup mode');
        this.isSetupMode = false;

        try {
            // Stop soft AP
            await this.stopSoftAP();
            
            // Reset credentials state
            this.resetCredentials();
            
            console.log('✅ WiFi setup mode stopped successfully');
            return true;
            
        } catch (error) {
            console.error('❌ Failed to stop WiFi setup mode:', error);
            return false;
        }
    }

    // Set credentials from QR code (called from renderer)
    setQRCredentials(credentials) {
        console.log('📱 QR credentials received:', credentials);
        this.pendingCredentials = credentials;
        this.credentialsReceived = true;
        
        // Immediately start connection process
        setTimeout(() => {
            this.connectToWiFi(credentials);
        }, 1000);
    }

    // Check if setup mode is active
    isInSetupMode() {
        return this.isSetupMode;
    }
}

module.exports = WiFiManager;