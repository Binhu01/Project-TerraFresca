(function () {
	// Only activate in native app context
	if (!document.body.classList.contains('capacitor-app')) return;

	var nav = document.getElementById('bottom-nav');
	if (!nav) return;

	// Show bottom nav
	nav.classList.remove('hidden');

	// Highlight current tab based on pathname
	var path = window.location.pathname;
	var items = nav.querySelectorAll('.bottom-nav-item');
	items.forEach(function (item) {
		item.classList.remove('active');
		var href = item.getAttribute('href');
		if (href && path.endsWith(href.replace(/^\//, ''))) {
			item.classList.add('active');
		}
	});

	// Handle Capacitor back button
	if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App) {
		window.Capacitor.Plugins.App.addListener('backButton', function (data) {
			if (data.canGoBack) {
				window.history.back();
			} else {
				// Navigate to home instead of exiting
				window.location.href = '/main.html';
			}
		});
	}
})();