sap.ui.define(['jquery.sap.global'],
	function(jQuery) {
	"use strict";

	// Very simple page-context personalization
	// persistence service, not for productive use!
	var PersoService = {

		oData : {
			_persoSchemaVersion: "1.0",
			aColumns : [
					{
					id: "__component0---worklist--table-__column0",
				
					visible: true
					
				},
				{
					id: "demoApp-table-Vbeln",
					order: 0,
					text: "Vbeln",
					visible: true
				},
				{
					id: "demoApp-table-PosnrC",
					order: 1,
					text: "PosnrC",
					visible: true
				},
				{
					id: "demoApp-table-Vbegdat",
					order: 2,
					text: "Vbegdat",
					visible: false
				},
				{
					id: "demoApp-table-Venddat",
					order: 3,
					text: "Venddat",
					visible: true
				}
			]
		},

		getPersData : function () {
			var oDeferred = new jQuery.Deferred();
			if (!this._oBundle) {
				this._oBundle = this.oData;
			}
			var oBundle = this._oBundle;
			oDeferred.resolve(oBundle);
			return oDeferred.promise();
		},

		setPersData : function (oBundle) {
			var oDeferred = new jQuery.Deferred();
			this._oBundle = oBundle;
			oDeferred.resolve();
			return oDeferred.promise();
		},

		delPersData : function () {
			var oDeferred = new jQuery.Deferred();
			var oInitialData = {
					_persoSchemaVersion: "1.0",
					aColumns : [
						
					{
					id: "demoApp-table-Vbeln",
					order: 2,
					text: "Vbeln",
					visible: true
				},
				{
					id: "demoApp-table-PosnrC",
					order: 1,
					text: "PosnrC",
					visible: true
				},
				{
					id: "demoApp-table-Vbegdat",
					order: 0,
					text: "Vbegdat",
					visible: false
				},
				{
					id: "demoApp-table-Venddat",
					order: 3,
					text: "Venddat",
					visible: true
				}
			
							]
			};

			//set personalization
			this._oBundle = oInitialData;

			//reset personalization, i.e. display table as defined
	//		this._oBundle = null;

			oDeferred.resolve();
			return oDeferred.promise();
		}

	};

	return PersoService;

});