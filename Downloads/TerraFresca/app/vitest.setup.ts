// Setup file: runs before any test modules are imported
// Mocks window.supabase so supabase-client.js can initialize in jsdom
(globalThis as any).window = globalThis as any;
(globalThis as any).supabase = {
	createClient: () => ({
		from: () => ({
			select: () => ({ eq: () => ({ single: async () => ({ data: null, error: null }) }) }),
			update: () => ({ eq: () => Promise.resolve() }),
		}),
		auth: { getUser: async () => ({ data: { user: null } }) },
	}),
};