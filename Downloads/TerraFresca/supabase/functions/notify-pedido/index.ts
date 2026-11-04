import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const STATUS_MESSAGES: Record<string, string> = {
	pago: 'Pedido confirmado!',
	enviado: 'Pedido saiu para entrega 🚚',
	entregue: 'Pedido entregue! Bom apetite 🌿',
};

serve(async (req) => {
	try {
		const { pedido_id, loja, novo_status, user_id, mensagem } = await req.json();

		if (!user_id) {
			console.warn('[notify-pedido] Missing user_id');
			return new Response(JSON.stringify({ ok: true }), { status: 200 });
		}

		const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
		const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
		const fcmServerKey = Deno.env.get('FCM_SERVER_KEY');
		const projectId = Deno.env.get('FCM_PROJECT_ID');

		if (!fcmServerKey || !projectId) {
			console.warn('[notify-pedido] FCM credentials not configured');
			return new Response(JSON.stringify({ ok: true }), { status: 200 });
		}

		const supabase = createClient(supabaseUrl, supabaseKey);
		const { data: perfil, error } = await supabase
			.from('perfis_usuarios')
			.select('fcm_token')
			.eq('id', user_id)
			.single();

		if (error || !perfil?.fcm_token) {
			console.warn(`[notify-pedido] No FCM token for user ${user_id}:`, error?.message);
			return new Response(JSON.stringify({ ok: true }), { status: 200 });
		}

		let body: string;
		if (novo_status === 'manual' && mensagem) {
			body = mensagem;
		} else {
			body = STATUS_MESSAGES[novo_status] || `Seu pedido foi atualizado.`;
		}

		const fcmResponse = await fetch(
			'https://fcm.googleapis.com/fcm/send',
			{
				method: 'POST',
				headers: {
					'Authorization': `key=${fcmServerKey}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					to: perfil.fcm_token,
					notification: {
						title: 'Terra Fresca',
						body,
					},
					data: {
						pedido_id: String(pedido_id),
						loja: String(loja),
						status: String(novo_status),
					},
				}),
			}
		);

		if (!fcmResponse.ok) {
			const errText = await fcmResponse.text();
			console.warn(`[notify-pedido] FCM send failed (${fcmResponse.status}):`, errText);
		}

		return new Response(JSON.stringify({ ok: true }), { status: 200 });
	} catch (e) {
		console.error('[notify-pedido] Unexpected error:', e);
		return new Response(JSON.stringify({ ok: true }), { status: 200 });
	}
});