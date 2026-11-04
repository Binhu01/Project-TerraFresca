import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType } from '@capacitor/camera';
import { BarcodeScanner } from '@capacitor-community/barcode-scanner';
import { Geolocation } from '@capacitor/geolocation';
import { NativeBiometric } from 'capacitor-native-biometric';
import { PushNotifications } from '@capacitor/push-notifications';

// supabase-client.js exposes a global var, not an ES module; access via window at runtime
const supabaseClient: any = (typeof window !== 'undefined' ? (window as any).supabaseClient : null);

let _pushListenersRegistered = false;
let _currentUserId: string | null = null;

export function isNative(): boolean {
	return Capacitor.isNativePlatform();
}

export async function tirarFotoProduto(): Promise<string | null> {
	if (!isNative()) return null;
	try {
		const photo = await Camera.getPhoto({
			quality: 80,
			resultType: CameraResultType.Base64,
		});
		return photo.base64String || null;
	} catch {
		return null;
	}
}

export async function escanearCodigoBarras(): Promise<string | null> {
	if (!isNative()) return null;
	try {
		return new Promise<string | null>((resolve) => {
			BarcodeScanner.start({}, (result, err) => {
				if (err || !result?.content) {
					resolve(null);
				} else {
					BarcodeScanner.stop().catch(() => {});
					resolve(result.content);
				}
			});
		});
	} catch {
		return null;
	}
}

export async function obterLocalizacaoAtual(): Promise<{ lat: number; lng: number } | null> {
	if (!isNative()) return null;
	try {
		const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true });
		return { lat: pos.coords.latitude, lng: pos.coords.longitude };
	} catch {
		return null;
	}
}

export async function autenticarBiometria(mensagem: string): Promise<boolean> {
	if (!isNative()) return true;
	try {
		await NativeBiometric.verifyIdentity({ reason: mensagem });
		return true;
	} catch {
		return false;
	}
}

export async function registrarPushToken(userId: string): Promise<void> {
	if (!isNative()) return;
	_currentUserId = userId;
	try {
		const perm = await PushNotifications.requestPermissions();
		if (perm.receive !== 'granted') return;
		await PushNotifications.register();
		if (!_pushListenersRegistered) {
			PushNotifications.addListener('registration', async (token) => {
				if (!_currentUserId) return;
				try {
					await supabaseClient
						.from('perfis_usuarios')
						.update({ fcm_token: token.value })
						.eq('id', _currentUserId);
					console.log('[native-bridge] FCM token saved for user:', _currentUserId);
				} catch (e) {
					console.warn('[native-bridge] Failed to save FCM token:', e);
				}
			});
			PushNotifications.addListener('registrationError', (err) => {
				console.warn('[native-bridge] FCM registration error:', err);
			});
			_pushListenersRegistered = true;
		}
	} catch (e) {
		console.warn('[native-bridge] Push registration failed:', e);
	}
}

if (typeof window !== 'undefined') {
	(window as any).nativeBridge = {
		isNative,
		tirarFotoProduto,
		escanearCodigoBarras,
		obterLocalizacaoAtual,
		autenticarBiometria,
		registrarPushToken,
	};
}