/* global QUnit */
QUnit.config.autostart = false;

sap.ui.getCore().attachInit(function () {
	"use strict";

	sap.ui.require([
		"ren/ZQTC_FUTURE_REN/test/unit/AllTests"
	], function () {
		QUnit.start();
	});
});