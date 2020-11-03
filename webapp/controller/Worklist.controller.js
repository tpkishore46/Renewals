sap.ui.define([
		"./BaseController",
		"sap/ui/model/json/JSONModel",
		"sap/ui/model/odata/v2/ODataModel",
		"../model/formatter",
		"sap/ui/model/Filter",
		"sap/ui/model/FilterOperator",
		"sap/ui/core/Fragment",
		"sap/ui/core/util/Export",
		"sap/ui/core/util/ExportTypeCSV",
		"sap/ui/table/TablePersoController",
		"../model/personalization"

	],
	function (BaseController, JSONModel, ODATAModel, formatter, Filter, FilterOperator, Fragment, Export, ExportType,
		TablePersoController, DemoPersoService) {
		"use strict";

		return BaseController.extend("ren.ZQTC_FUTURE_REN.controller.Worklist", {

			formatter: formatter,

			/* =========================================================== */
			/* lifecycle methods                                           */
			/* =========================================================== */

			/**
			 * Called when the worklist controller is instantiated.
			 * @public
			 */
			onInit: function () {
				//Get BP number from URL
				try {
					sap.ui.getCore().bp = jQuery.sap.getUriParameters().mParams["sap-data-bp"][0];
				} catch (ab) {
					sap.ui.getCore().bp = "";
				}
				sap.ui.getCore().renstatus = null;
				if (sap.ui.getCore().bp === "") {
					sap.ui.getCore().bp = "1000000236";
				}
				// Model used to manipulate control states
				// oViewModel = new JSONModel({
				// 	worklistTableTitle: this.getResourceBundle().getText("worklistTableTitle"),
				// 	shareOnJamTitle: this.getResourceBundle().getText("worklistTitle"),
				// 	shareSendEmailSubject: this.getResourceBundle().getText("shareSendEmailWorklistSubject"),
				// 	shareSendEmailMessage: this.getResourceBundle().getText("shareSendEmailWorklistMessage", [location.href]),
				// 	tableNoDataText: this.getResourceBundle().getText("tableNoDataText"),
				// 	tableBusyDelay: 0
				// });
				// this.setModel(oViewModel, "worklistView");

				// Make sure, busy indication is showing immediately so there is no
				// break after the busy indication for loading the view's meta data is
				// ended (see promise 'oWhenMetadataIsLoaded' in AppController)
				// oTable.attachEventOnce("updateFinished", function () {
				// 	// Restore original busy indicator delay for worklist's table
				// 	oViewModel.setProperty("/tableBusyDelay", iOriginalBusyDelay);
				// });
				//Default Contract dates default
				this.setDefaultDates();
				//Get Main ENtity set data
				this.getData();

				//Table Personalization
				this._oTPC = new TablePersoController("perosId", {
					table: this.getView().byId("table"),
					//specify the first part of persistence ids e.g. 'demoApp-productsTable-dimensionsCol'
					componentName: "demoApp",
					persoService: DemoPersoService
				});
			},
			/* =========================================================== */
			/* Set Default Contract dates                                              */
			/* =========================================================== */

			setDefaultDates: function () {
				var currentDate = new Date();
				var oToDate = this.getView().byId("IDatefrom");
				oToDate.setDateValue(currentDate);
				// sap.ui.getCore().startdate = currentDate;

				var date = currentDate;
				date = date.setDate(date.getDate() + 720);
				this.getView().byId("IDateto").setDateValue(new Date(date));

				var currentDate2 = new Date();
				var oToDate2 = this.getView().byId("IDatefrom");
				oToDate2.setDateValue(currentDate2);

				var oDateFormat = sap.ui.core.format.DateFormat.getInstance({
					pattern: "yyyy-MM-dd"
				});
				sap.ui.getCore().enddate = oDateFormat.format(currentDate);
				sap.ui.getCore().startdate = oDateFormat.format(currentDate2);

			},
			/* =========================================================== */
			/* Get data from main entity set                               */
			/* =========================================================== */

			getData: function () {
				var that = this;
				var sUrl = "/sap/opu/odata/sap/ZQTC_FUTURE_RENEWAL_PLAN_SRV/";
				var oDataModel = new ODATAModel(sUrl, {
					json: true,
					loadMetadataAsync: true
				});

				oDataModel.read("/GETLISTSet", {
					filters: [this.getInitialFilter()],
					and: true,
					success: function (oData, response) {

						that.getView().setBusy(false);
						var oJSONModel = new sap.ui.model.json.JSONModel();

						//set Row colors
						for (var i = 0; i < oData.results.length; i++) {
							var record = oData.results[i];
							if (record.ExclStatus === "X" || record.RenStatus === "C") {
								record.District = "Indication02";
								record.Color = "";
							} else if (record.FutureOrd) {
								record.District = "Indication04";
								record.Color = "";
							} else {
								record.District = "None";
								record.Color = "";
							}
						}
						oJSONModel.setData(oData);
						sap.ui.getCore().setModel(oJSONModel);
						that.getView().setModel(oJSONModel, "tp");
					},
					error: function (oError) {
						that.getView().setBusy(false);
						sap.m.MessageToast.show("Error in Fetching Data");
					}
				});
			},
			/* =========================================================== */
			/* Filter to fetch main entity set data                        */
			/* =========================================================== */

			getInitialFilter: function () {

				return new Filter({
					filters: [
						new Filter("Kunag", sap.ui.model.FilterOperator.EQ, sap.ui.getCore().bp),
						new Filter("RenStatus", sap.ui.model.FilterOperator.EQ, sap.ui.getCore().renstatus),
						new Filter("Vbegdat", sap.ui.model.FilterOperator.EQ, sap.ui.getCore().startdate),
						new Filter("Venddat", sap.ui.model.FilterOperator.EQ, sap.ui.getCore().enddate)
					],
					and: true
				});

			},
			/* =========================================================== */
			/* On After Rendering for setting BP on screen                 */
			/* =========================================================== */

			onAfterRendering: function () {
				this.getView().byId("bpInput").setValue(sap.ui.getCore().bp);
				// this.getView().byId("table").setVisibleRowCount("6");    
			},
			/* =========================================================== */
			/* Refresh Table data                                          */
			/* =========================================================== */

			refresh: function () {

				sap.ui.getCore().startdate = this.getView().byId("IDatefrom").getValue();
				sap.ui.getCore().enddate = this.getView().byId("IDateto").getValue();
				this.getView().byId("searchField").setValue("");
				this.getData();
			},
			/* =========================================================== */
			/*  Ship To Address Fragment Implementation                    */
			/* =========================================================== */
			addressOld: "",
			fragmentAdd: null,
			addObject: "",
			addObjArray: [],
			shiptoAdd: function (oEvent) {
				//Selected Row on main table and Selected ID
				this.selectedRowAdd = oEvent.getSource().getBindingContext("tp");
				this.btnId = oEvent.getParameter("id");
				// Set Address old data and new data
				var addObjectOld = {};
				for (var i = 0; i < this.addObjArray.length; i++) {
					if (this.addObjArray[i].Id === this.btnId) {
						addObjectOld = this.addObjArray[i];
						this.addObjectOld = addObjectOld;
						//return;
					}
				}
				if (!addObjectOld.Id) {
					addObjectOld.Id = this.btnId;
					addObjectOld.shipto = oEvent.getSource().getBindingContext("tp").getProperty("Kunwe");
					addObjectOld.Street = oEvent.getSource().getBindingContext("tp").getProperty("Street");
					addObjectOld.Street2 = oEvent.getSource().getBindingContext("tp").getProperty("StrSuppl1");
					addObjectOld.Street3 = oEvent.getSource().getBindingContext("tp").getProperty("StrSuppl2");
					addObjectOld.Street4 = oEvent.getSource().getBindingContext("tp").getProperty("StrSuppl3");
					try {
						addObjectOld.Location = oEvent.getSource().getBindingContext("tp").getProperty("Location");
					} catch (msg) {
						addObjectOld.Location = "";
					}
					addObjectOld.City1 = oEvent.getSource().getBindingContext("tp").getProperty("City1");
					addObjectOld.Region = oEvent.getSource().getBindingContext("tp").getProperty("Region");
					addObjectOld.Country = oEvent.getSource().getBindingContext("tp").getProperty("Country");
					addObjectOld.PostCode1 = oEvent.getSource().getBindingContext("tp").getProperty("PostCode1");
					this.addObjectOld = addObjectOld;
					this.addObjArray.push(addObjectOld);
				}
				//Create Fragmnet Object
				if (this.fragmentAdd === null) {
					this.fragmentAdd = new sap.ui.xmlfragment("ren.ZQTC_FUTURE_REN.view.fragmentAddress", this);
					this.getView().addDependent(this.fragmentAdd);
				}

				sap.ui.getCore().byId("street").setText(addObjectOld.Street);
				sap.ui.getCore().byId("street2").setText(addObjectOld.Street2);
				sap.ui.getCore().byId("street3").setText(addObjectOld.Street3);
			    sap.ui.getCore().byId("street4").setText(addObjectOld.Street4);
			    sap.ui.getCore().byId("street5").setText(addObjectOld.Location);
				sap.ui.getCore().byId("city").setText(addObjectOld.City1);
				sap.ui.getCore().byId("country").setText(addObjectOld.Country);
				sap.ui.getCore().byId("regio").setText(addObjectOld.Region);
				sap.ui.getCore().byId("postcode").setText(addObjectOld.PostCode1);

				//	this.fragmentAdd.setModel(this.getView().getModel("tp"));
				this.fragmentAdd.setTitle("Ship To Party " + addObjectOld.shipto);
				//	sap.ui.getCore().byId("SimpleFormAdd").bindElement(oPath);

				var sPath = this.selectedRowAdd.getPath();
				this.fragmentAdd.setModel(this.getView().getModel("tp"));
				this.fragmentAdd.bindElement(sPath);

				this.fragmentAdd.open();
			},
			/* =========================================================== */
			/* Fragment Address Doctor implementation                      */
			/* =========================================================== */

			fragmentAddDoc: null,
			addUpdate: function (oEvent) {
				var dataObject = {};
				dataObject.shipto = this.getView().getModel("tp").getProperty("Kunwe", this.selectedRowAdd);
				dataObject.Street = this.getView().getModel("tp").getProperty("Street", this.selectedRowAdd);
				try {
					dataObject.Location = this.getView().getModel("tp").getProperty("Location", this.selectedRowAdd);
				} catch (msg) {
					dataObject.Location = "";
				}
				dataObject.City1 = this.getView().getModel("tp").getProperty("City1", this.selectedRowAdd);
				dataObject.Region = this.getView().getModel("tp").getProperty("Region", this.selectedRowAdd);
				dataObject.Country = this.getView().getModel("tp").getProperty("Country", this.selectedRowAdd);
				dataObject.PostCode1 = this.getView().getModel("tp").getProperty("PostCode1", this.selectedRowAdd);
				dataObject.NameWe = this.getView().getModel("tp").getProperty("NameWe", this.selectedRowAdd);
				var addChange = "X";
				this.getView().getModel("tp").setProperty("AddressChg", addChange, this.selectedRowAdd);

				//instantiate address doctor popup
				if (this.fragmentAddDoc === null) {
					this.fragmentAddDoc = new sap.ui.xmlfragment("ren.ZQTC_FUTURE_REN.view.fragmentAddDoc", this);
					this.getView().addDependent(this.fragmentAddDoc);
				}
				var that = this;
				//Input filter to get address Suggesions
				var oFilter1 = new sap.ui.model.Filter("Partner", FilterOperator.EQ, dataObject.shipto);
				var oFilter2 = new sap.ui.model.Filter("Street", FilterOperator.EQ, dataObject.Street);
				var oFilter3 = new sap.ui.model.Filter("Location", FilterOperator.EQ, dataObject.Location);
				var oFilter4 = new sap.ui.model.Filter("City", FilterOperator.EQ, dataObject.City1);
				var oFilter5 = new sap.ui.model.Filter("Region", FilterOperator.EQ, dataObject.Region);
				var oFilter6 = new sap.ui.model.Filter("Country", FilterOperator.EQ, dataObject.Country);
				var oFilter7 = new sap.ui.model.Filter("PostalCode", FilterOperator.EQ, dataObject.PostCode1);
				var oFilter8 = new sap.ui.model.Filter("FirstName", FilterOperator.EQ, dataObject.NameWe);
				var oFilter = new sap.ui.model.Filter({
					filters: [
						oFilter1,
						oFilter2,
						oFilter3,
						oFilter4,
						oFilter5,
						oFilter6,
						oFilter7,
						oFilter8
					],
					and: true
				});
				//Fetch address Suggestions
				var odataModel = new sap.ui.model.odata.v2.ODataModel("/sap/opu/odata/sap/ZQTC_FUTURE_RENEWAL_PLAN_SRV/");
				odataModel.read("/ADDRESSCHECKSet", {
					filters: [oFilter],
					success: function (oData, resp) {

						if (oData.results.length > 0) {
							var oModel = new sap.ui.model.json.JSONModel();
							oModel.setData(oData);
							that.getView().setModel(oModel, "doc");
							sap.ui.getCore().setModel(oModel);
							that.fragmentAddDoc.open();
						} else {
							that.selectedRowAdd.getObject().Color = "yellow";
							that.getView().byId(that.btnId).addCustomData(
								new sap.ui.core.CustomData({
									key: "colorCode",
									value: "{tp>Color}",
									writeToDom: true
								}));
							that.fragmentAdd.close();
						}
					},
					error: function (err) {

					}
				});

				//		
			},
			//Address Selection from Address doctor
			addDocSelect: function (oEvent) {

				var dataObject = {};

				dataObject.street = oEvent.getParameter("listItem").getBindingContext("doc").getProperty("Street");
				dataObject.country = oEvent.getParameter("listItem").getBindingContext("doc").getProperty("Country");
				dataObject.region = oEvent.getParameter("listItem").getBindingContext("doc").getProperty("Region");
				dataObject.postcode = oEvent.getParameter("listItem").getBindingContext("doc").getProperty("PostalCode");
				dataObject.street2 = oEvent.getParameter("listItem").getBindingContext("doc").getProperty("StrSuppl1");
				dataObject.location = oEvent.getParameter("listItem").getBindingContext("doc").getProperty("Location");
				dataObject.street3 = oEvent.getParameter("listItem").getBindingContext("doc").getProperty("StrSuppl2");
				dataObject.street4 = oEvent.getParameter("listItem").getBindingContext("doc").getProperty("StrSuppl3");
			
				dataObject.city = oEvent.getParameter("listItem").getBindingContext("doc").getProperty("City");

				this.getView().getModel("tp").setProperty("Street", dataObject.street, this.selectedRowAdd);
				this.getView().getModel("tp").setProperty("StrSuppl1", dataObject.street2, this.selectedRowAdd);
				this.getView().getModel("tp").setProperty("StrSuppl2", dataObject.street3, this.selectedRowAdd);
				this.getView().getModel("tp").setProperty("StrSuppl3", dataObject.street4, this.selectedRowAdd);
				this.getView().getModel("tp").setProperty("Location", dataObject.location, this.selectedRowAdd);
				this.getView().getModel("tp").setProperty("City1", dataObject.city, this.selectedRowAdd);
				this.getView().getModel("tp").setProperty("Region", dataObject.region, this.selectedRowAdd);
				this.getView().getModel("tp").setProperty("Country", dataObject.country, this.selectedRowAdd);
				this.getView().getModel("tp").setProperty("PostCode1", dataObject.postcode, this.selectedRowAdd);

				this.selectedRowAdd.getObject().Color = "yellow";
				this.getView().byId(this.btnId).addCustomData(
					new sap.ui.core.CustomData({
						key: "colorCode",
						value: "{tp>Color}",
						writeToDom: true
					}));
				this.fragmentAddDoc.close();
				this.fragmentAdd.close();
			},
			cancelAddDoc: function () {
				this.selectedRowAdd.getObject().Color = "yellow";
				this.getView().byId(this.btnId).addCustomData(
					new sap.ui.core.CustomData({
						key: "colorCode",
						value: "{tp>Color}",
						writeToDom: true
					}));
				this.fragmentAddDoc.close();
				this.fragmentAdd.close();
			},
			//Address reset from address Popup
			addReset: function () {

				this.getView().getModel("tp").setProperty("Street", this.addObjectOld.Street, this.selectedRowAdd);
				this.getView().getModel("tp").setProperty("StrSuppl1", this.addObjectOld.Street2, this.selectedRowAdd);
				this.getView().getModel("tp").setProperty("StrSuppl2", this.addObjectOld.Street3, this.selectedRowAdd);
				this.getView().getModel("tp").setProperty("StrSuppl3", this.addObjectOld.Street4, this.selectedRowAdd);
				this.getView().getModel("tp").setProperty("Location", this.addObjectOld.Location, this.selectedRowAdd);
				this.getView().getModel("tp").setProperty("City1", this.addObjectOld.City1, this.selectedRowAdd);
				this.getView().getModel("tp").setProperty("Region", this.addObjectOld.Region, this.selectedRowAdd);
				this.getView().getModel("tp").setProperty("Country", this.addObjectOld.Country, this.selectedRowAdd);
				this.getView().getModel("tp").setProperty("PostCode1", this.addObjectOld.PostCode1, this.selectedRowAdd);
				//	this.getView().byId(this.btnId).removeStyleClass("row");
				this.getView().byId(this.btnId).destroyCustomData();
				//	this.fragmentAdd.close();
			},
			cancelAdd: function () {
				this.fragmentAdd.close();

			},
			/* =========================================================== */
			/* Value Help for BP on selection Sold To on Output               */
			/* =========================================================== */

			inputBPID: "",
			fragmentSold: null,
			fragmentBP: null,
			onHelpRequestBP: function (oEvent) {
				this.inputBPID = oEvent.getSource().getId();
				if (this.fragmentBP === null) {
					this.fragmentBP = new sap.ui.xmlfragment("fragmentBPID", "ren.ZQTC_FUTURE_REN.view.fragmentSold", this);
					this.fragmentBP.setTitle("BP Value Help");
					this.getView().addDependent(this.fragmentBP);
				}
				//this.fragmentBP.openBy(this.inputBPID);
				this.fragmentBP.open();
			},
			onHelpRequestSold: function (oEvent) {

				this.inputBPID = oEvent.getSource().getId();
				this.selectedRow = oEvent.getSource().getBindingContext("tp");
				this.selectedSold = oEvent.getSource().getBindingContext("tp").getProperty("Kunag");

				if (this.fragmentSold === null) {
					this.fragmentSold = new sap.ui.xmlfragment("fragmentBPsold", "ren.ZQTC_FUTURE_REN.view.fragmentSold", this);
					this.fragmentSold.setTitle("SoldTo Value Help");
					this.getView().addDependent(this.fragmentSold);

				}

				this.fragmentSold.open();
			},
			//Search soldTo on soldTo value help
			searchEHSold: function (oEvent) {

				var value = oEvent.getParameter("query");
				//value.toUpperCase();
				var oFilter = new sap.ui.model.Filter("Name1", sap.ui.model.FilterOperator.EQ, value);
				var oTable;
				//	var oTitle = 
				//var oTable = sap.ui.getCore().byId("mySoldTable");
				if (oEvent.getSource().getId() === "fragmentBPID--mySoldSearch") {
					oTable = sap.ui.core.Fragment.byId("fragmentBPID", "mySoldTable");
				} else {
					oTable = sap.ui.core.Fragment.byId("fragmentBPsold", "mySoldTable");
				}
				//var oTable = this.fragmentSold.getContent()[1];
				var oTableItems = oTable.getBinding("items");

				oTableItems.filter(oFilter);

			},
			//Select SoldTo on soldTo F4 help
			soldToSelect: function (oEvent) {
				var value = oEvent.getParameter("listItem").getBindingContext().getProperty("Kunnr");
				//	var name =  oEvent.getParameter("listItem").getBindingContext().getProperty("Name1");
				this.selectedItemSold = value;

				if (oEvent.getSource().getId() === "fragmentBPID--mySoldTable") {
					this.getView().byId("bpInput").setValue(value);
					sap.ui.getCore().bp = value;
					this.fragmentBP.close();
				} else {

					//this.getView().byId("soldInput").setValue(value);
					//	this.getView().byId("soldInput").setText(value);
					//this.selectedRow.setValue(value);
					this.getView().getModel("tp").setProperty("Kunag", value, this.selectedRow);
					//	this.getView().byId(this.inputBPID).addStyleClass("row");
					//Adding cutom data to button
					this.selectedRow.getObject().Color = "yellow";
					this.getView().byId(this.inputBPID).addCustomData(
						new sap.ui.core.CustomData({
							key: "colorCode",
							value: "{tp>Color}",
							writeToDom: true
						}));

					var valueOld = this.getView().getModel("tp").getProperty("KunagOld", this.selectedRow);
					this.getView().getModel("tp").setProperty("KunagOldSet", valueOld, this.selectedRow);
					if (value === valueOld) {
						this.getView().byId(this.inputBPID).destroyCustomData();
						this.getView().getModel("tp").setProperty("KunagOldSet", "", this.selectedRow);
					}
					var oTable = sap.ui.core.Fragment.byId("fragmentBPsold", "mySoldTable");
					oTable.removeSelections();
					this.fragmentSold.close();
				}
				this.inputBPID = "";
			},
			//Change soldto from input 
			bpChange: function (oEvent) {

				var Value = oEvent.getParameter("value");
				sap.ui.getCore().bp = Value ? Value : null;

				if (this.selectedItemSold) {
					var oTable = sap.ui.core.Fragment.byId("fragmentBPID", "mySoldTable");
					oTable.removeSelections(true);
				}
			},
			//Change soldto from input 
			soldChange: function (oEvent) {

				//var Value = oEvent.getParameter("value");

				if (this.selectedItemSold) {
					var oTable = sap.ui.core.Fragment.byId("fragmentBPsold", "mySoldTable");
					oTable.removeSelections(true);
				}
			},
			//cancel sold To popup
			cancelSold: function (oEvent) {
				if (oEvent.getSource().getId() === "fragmentBPID--soldReject") {
					this.fragmentBP.close();
				} else {
					this.fragmentSold.close();
				}
				this.inputBPID = "";
			},
			// To give suggetions for Sold To
			onSuggest: function (oEvent) {
				var sTerm = oEvent.getParameter("suggestValue");
				var aFilters = [];
				if (sTerm) {
					aFilters.push(new Filter("Name1", FilterOperator.StartsWith, sTerm));
				}

				oEvent.getSource().getBinding("suggestionItems").filter(aFilters);

			},
			//Selected Item from suggested Items SoldTo
			onSuggestionSoldTo: function (oEvent) {

				var selectedItem = oEvent.getParameter("selectedItem");
				sap.ui.getCore().bp = selectedItem.getKey();

			},
			/* =========================================================== */
			/* Renewal Status selected onselection drop down         */
			/* =========================================================== */
			//Renewal status selected
			renSelected: function (oEvent) {

				var selectedItem = this.getView().byId("renstat").getSelectedItem();
				sap.ui.getCore().renstatus = selectedItem ? selectedItem.getKey() : null;
				if (sap.ui.getCore().renstatus === "") {
					sap.ui.getCore().renstatus = "R";
				}
			},
			/* =========================================================== */
			/* Value Help for Product                                      */
			/* =========================================================== */
			inputProdId: "",
			fragmentProd: null,

			onHelpRequestProd: function (oEvent) {
				this.inputProdId = oEvent.getSource().getId();
				this.selectedRowProd = oEvent.getSource().getBindingContext("tp");
				this.selectedProdOld = oEvent.getSource().getBindingContext("tp").getProperty("Matnr");
				if (this.fragmentProd === null) {
					this.fragmentProd = new sap.ui.xmlfragment("ren.ZQTC_FUTURE_REN.view.fragmentProduct", this);
					this.fragmentProd.setTitle("Product Value Help");
					this.getView().addDependent(this.fragmentProd);
				}

				this.fragmentProd.open();
			},

			//Search Prod on product value help
			searchEHProd: function (oEvent) {

				var value = oEvent.getParameter("query");
				//value.toUpperCase();
				var oFilter = new sap.ui.model.Filter("Maktx", sap.ui.model.FilterOperator.EQ, value);

				var oTable = sap.ui.getCore().byId("myProdTable");
				//var oTable = this.fragmentSold.getContent()[1];
				var oTableItems = oTable.getBinding("items");

				oTableItems.filter(oFilter);

			},
			//Select SoldTo on soldTo F4 help
			rowSelectionMedia: function (oEvent) {
				var value = oEvent.getParameter("listItem").getBindingContext().getProperty("Matnr");
				var valueOld = this.getView().getModel("tp").getProperty("MatnrOld", this.selectedRowProd);
				//	this.selectedItemProd = value;

				//this.getView().byId("soldInput").setValue(value);
				//this.selectedRow.setValue(value);
				this.getView().getModel("tp").setProperty("Matnr", value, this.selectedRowProd);
				//	this.getView().byId(this.inputProdId).addStyleClass("row");
				//Adding cutom data to button
				this.selectedRowProd.getObject().Color = "yellow";
				this.getView().byId(this.inputProdId).addCustomData(
					new sap.ui.core.CustomData({
						key: "colorCode",
						value: "{tp>Color}",
						writeToDom: true
					}));
				this.getView().getModel("tp").setProperty("MatnrOldSet", valueOld, this.selectedRowProd);
				//	this.getView().getModel("tp").setProperty("Maktx",desc,this.selectedRowProd);
				sap.ui.getCore().byId("myProdTable").removeSelections();
				if (value === valueOld) {
					this.getView().byId(this.inputProdId).destroyCustomData();
					this.getView().getModel("tp").setProperty("MatnrOldSet", "", this.selectedRowProd);
				}
				//Set Reason for rejection
				if (this.reasonValue) {
					this.getView().getModel("tp").setProperty("Abgru", this.reasonValue, this.selectedRowProd);
				}
				this.fragmentProd.close();

			},
			//Handle reason for rejection
			reasonChange: function (oEvent) {
				var selectedItem = oEvent.getParameters("listItem").selectedItem;
				var value = selectedItem ? selectedItem.getKey() : " ";
				this.getView().getModel("tp").setProperty("Abgru", value, this.selectedRowProd);
				this.reasonValue = value;
			},
			//cancel Product popup
			cancelProd: function (oEvent) {

				this.fragmentProd.close();

			},

			/* =========================================================== */
			/* Price Group drop down                                       */
			/* =========================================================== */
			//Price group change
			pricegrpChange: function (oEvent) {

				this.selectedItemPrice = oEvent.getSource().getBindingContext("tp").getProperty("Price");
				var selectedItem = oEvent.getSource().getBindingContext("tp");
				var priceOld = oEvent.getSource().getBindingContext("tp").getProperty("PriceOld");
				this.getView().getModel("tp").setProperty("PriceOldSet", priceOld, selectedItem);
				var selectedId = oEvent.getSource().getId();
				//Adding cutom data to button

				oEvent.getSource().getBindingContext("tp").getObject().Color = "yellow";
				this.getView().byId(selectedId).addCustomData(
					new sap.ui.core.CustomData({
						key: "colorCode",
						value: "{tp>Color}",
						writeToDom: true
					}));

			},

			/* =========================================================== */
			/* Responsive Pop Over for Qty Field on Output
			/* =========================================================== */
			fragmentPrice: null,

			qtyPress: function (oEvent) {

				this.inputQtyId = oEvent.getSource().getId();
				this.selectedRowQty = oEvent.getSource().getBindingContext("tp");
				this.selectedQtyOld = oEvent.getSource().getBindingContext("tp").getProperty("Zmeng");
				var oButton = oEvent.getSource();

				if (!this._oPopover) {

					Fragment.load({
						name: "ren.ZQTC_FUTURE_REN.view.fragmentPrice",
						controller: this
					}).then(function (oPopover) {
						this._oPopover = oPopover;
						this.getView().addDependent(this._oPopover);

						this._oPopover.openBy(oButton);
					}.bind(this));
				} else {
					this._oPopover.openBy(oButton);
				}
			},
			handleOkButtonPrice: function (oEvent) {

				var value = sap.ui.getCore().byId("inputQty").getValue();
				var valueOld = this.getView().getModel("tp").getProperty("ZmengOld", this.selectedRowQty);
				this.getView().getModel("tp").setProperty("Zmeng", sap.ui.getCore().byId("inputQty").getValue(), this.selectedRowQty);
				//this.getView().byId(this.inputQtyId).addStyleClass("row");
				//Adding cutom data to button
				this.selectedRowQty.getObject().Color = "yellow";
				this.getView().byId(this.inputQtyId).addCustomData(
					new sap.ui.core.CustomData({
						key: "colorCode",
						value: "{tp>Color}",
						writeToDom: true
					}));

				this.getView().getModel("tp").setProperty("ZmengOldSet", valueOld, this.selectedRowQty);
				value.toString();
				valueOld.toString();
				var value2 = value.trimLeft();
				var valueOld2 = valueOld.trimLeft();
				if (value2 === valueOld2) {
					this.getView().getModel("tp").setProperty("ZmengOldSet", "", this.selectedRowQty);
					this.getView().byId(this.inputQtyId).destroyCustomData();
				}
				this._oPopover.close();
			},
			handleCloseButtonPrice: function (oEvent) {
				this._oPopover.close();
			},

			/* =========================================================== */
			/* Value Help for Payment Method                               */
			/* =========================================================== */

			fragmento: null,
			payMethodF4: function (oEvent) {
				this.selectedRowPayMeth = oEvent.getSource().getBindingContext("tp");
				this.payinputId = oEvent.getSource().getId();
				this.payMethod = oEvent.getSource().getBindingContext("tp").getProperty("Zlsch");
				var that = this;

				var country = this.getView().getModel("tp").getProperty("Country", this.selectedRowPayMeth);
				var oFilter = new sap.ui.model.Filter("Land1", FilterOperator.EQ, country);
				var odataModel = new sap.ui.model.odata.v2.ODataModel("/sap/opu/odata/sap/ZQTC_FUTURE_RENEWAL_PLAN_SRV/");
				odataModel.read("/PaymethodSet", {
					filters: [oFilter],
					success: function (oData, resp) {
						var oModel = new sap.ui.model.json.JSONModel();
						oModel.setData(oData);
						that.getView().setModel(oModel, "paymeth");
						sap.ui.getCore().setModel(oModel);
						that.showPaymeth();
					},
					error: function (err) {

					}
				});

			},
			showPaymeth: function () {
				if (this.fragmento === null) {
					this.fragmento = new sap.ui.xmlfragment("ren.ZQTC_FUTURE_REN.view.fragmentPayMeth", this);
					this.fragmento.bindAggregation("items", {
						path: "paymeth>/results",
						parameters: {
							//	operationMode: "Client"
						},
						template: new sap.m.DisplayListItem({
							label: "{paymeth>Zlsch}",
							value: "{paymeth>Text2}"
						})
					});

					this.getView().addDependent(this.fragmento);
				}
				this.fragmento.open();
			},
			//Aftre clicking Ok on popup
			handlePaymethConfirm: function (oEvent) {

				var selectedItem = oEvent.getParameter("selectedItem");

				var value = selectedItem.getLabel();
				var valueOld = this.getView().getModel("tp").getProperty("ZlschOld", this.selectedRowPayMeth);
				this.getView().getModel("tp").setProperty("Zlsch", value, this.selectedRowPayMeth);
				this.getView().getModel("tp").setProperty("ZlschOldSet", valueOld, this.selectedRowPayMeth);
				//	this.getView().byId(this.payinputId).addStyleClass("row");
				//Adding cutom data to button
				this.selectedRowPayMeth.getObject().Color = "yellow";
				this.getView().byId(this.payinputId).addCustomData(
					new sap.ui.core.CustomData({
						key: "colorCode",
						value: "{tp>Color}",
						writeToDom: true
					}));

				if (value === valueOld) {
					this.getView().getModel("tp").setProperty("ZlschOldSet", "", this.selectedRowPayMeth);
					this.getView().byId(this.payinputId).destroyCustomData();
				}
				//sap.ui.getCore().byId(this.inputId).setValue(Value);
			},

			//Search on Popup Payment Methods
			onSearchPaymethf4: function (oEvent) {
				var oBinding = oEvent.getParameter("itemsBinding");
				var sValue = oEvent.getParameter("value");
				if (!sValue) {
					oBinding.filter([]);
				} else {

					var oFilter1 = new sap.ui.model.Filter("Zlsch", FilterOperator.Contains, sValue);

					oBinding.filter([oFilter1]);
				}

			},

			/* =========================================================== */
			/* Exclusion Reason with Inclusion Popup                       */
			/* =========================================================== */
			fragmentExcl: null,
			exclStatusF4: function (oEvent) {
				var selectedRowExcl = oEvent.getSource().getBindingContext("tp");
				var vbeln = this.getView().getModel("tp").getProperty("Vbeln", selectedRowExcl);
				var posnr = this.getView().getModel("tp").getProperty("PosnrC", selectedRowExcl);
				if (this.getView().getModel("tp").getProperty("ExclStatus", selectedRowExcl) === "") {
					sap.m.MessageBox.warning("Exclusion Reason is Not Set For This Item!");
				} else {

					if (this.fragmentExcl === null) {
						this.fragmentExcl = new sap.ui.xmlfragment("ren.ZQTC_FUTURE_REN.view.fragmentExcl", this);

						this.getView().addDependent(this.fragmentExcl);
						this.fragmentExcl.setTitle("Item Exclusion Details" + " " + vbeln + " " + posnr);
					}
					this.selectedRowExcl = selectedRowExcl;
					this.showExcldata();
				}

			},
			showExcldata: function () {
				var that = this;
				var vbeln = this.getView().getModel("tp").getProperty("Vbeln", this.selectedRowExcl);
				var posnr = this.getView().getModel("tp").getProperty("PosnrC", this.selectedRowExcl);
				var oFilter1 = new sap.ui.model.Filter("Vbeln", FilterOperator.EQ, vbeln);
				var oFilter2 = new sap.ui.model.Filter("Posnr", FilterOperator.EQ, posnr);
				var oFilter = new sap.ui.model.Filter({
					filters: [
						oFilter1,
						oFilter2
					],
					and: true
				});
				var odataModel = new sap.ui.model.odata.v2.ODataModel("/sap/opu/odata/sap/ZQTC_FUTURE_RENEWAL_PLAN_SRV/");
				odataModel.read("/ExclusionDetailsSet", {
					filters: [oFilter],
					success: function (oData, resp) {

						var oModel = new sap.ui.model.json.JSONModel();
						oModel.setData(oData);
						that.getView().setModel(oModel, "excl");
						sap.ui.getCore().setModel(oModel);
						that.fragmentExcl.setModel(that.getView().getModel("excl"));
						that.fragmentExcl.bindElement("/results/0");
						that.fragmentExcl.open();

					},
					error: function (err) {
						sap.m.MessagBox.Error("Error in Fetching Item Exclusion Data");
					}
				});
			},
			cancelExcl: function () {
				this.fragmentExcl.close();
			},
			includeExcl: function (oEvent) {

				var dataRecord = {};
				dataRecord.Vbeln = this.getView().getModel("tp").getProperty("Vbeln", this.selectedRowExcl);
				dataRecord.Posnr = this.getView().getModel("tp").getProperty("PosnrC", this.selectedRowExcl);
				if (oEvent.getSource().getId() === "inclExcl") {
					dataRecord.ExclResn = this.getView().getModel("excl").getData().results[0].ExclResn;
					this.exclResn1 = "X";
				} else {
					dataRecord.ExclResn2 = this.getView().getModel("excl").getData().results[0].ExclResn2;
					this.exclResn2 = "X";
				}
				var oKey = this.getView().getModel().createKey("/IncludeSet", {
					Vbeln: dataRecord.Vbeln
						//	Posnr: dataRecord.Posnr
				});

				var that = this;
				//oEvent.getSource().setEnabled(false);
				var odataModel = new sap.ui.model.odata.v2.ODataModel("/sap/opu/odata/sap/ZQTC_FUTURE_RENEWAL_PLAN_SRV/");
				odataModel.update(oKey, dataRecord, {
					success: function (oData, resp) {
						sap.m.MessageBox.success("Item Included for Renewal");
						that.showExcldata();
						that.getView().getModel("tp").setProperty("ExclStatus", "", that.selectedRowExcl);
						that.getView().getModel("tp").setProperty("District", "None", that.selectedRowExcl);
						//	that.includeId.setEnabled(false);
					},
					error: function (err) {
						sap.m.MessageBox.error("Item Inclusion failed");
					}
				});
			},
			/* =========================================================== */
			/* Value Help for Country on Ship to Address Popup              */
			/* =========================================================== */
			fragmentCon: null,
			countryOnF4: function (oEvent) {
				//	this.selectedRowCon = oEvent.getSource().getBindingContext("tp");
				//	this.inputId = oEvent.getSource().getId();
				if (this.fragmentCon === null) {
					this.fragmentCon = new sap.ui.xmlfragment("ren.ZQTC_FUTURE_REN.view.fragmentCntry", this);
					this.fragmentCon.bindAggregation("items", {
						path: "/CountrySet",
						parameters: {
							//	operationMode: "Client"
						},
						template: new sap.m.DisplayListItem({
							label: "{Land1}",
							value: "{Landx}"
						})
					});

					this.getView().addDependent(this.fragmentCon);
				}
				this.fragmentCon.open();
			},
			//Aftre clicking Ok on popup
			handleCntryValueHelpConfirm: function (oEvent) {

				var selectedItem = oEvent.getParameter("selectedItem");

				var value = selectedItem.getLabel();
				//this.getView().getModel("tp").setProperty("Matnr",value,this.selectedRowPayMeth);
				sap.ui.getCore().byId("cntryNew").setValue(value);
			},
			//Search on Popup Payment Methods
			onSearchCountryf4: function (oEvent) {
				var oBinding = oEvent.getParameter("itemsBinding");
				var sValue = oEvent.getParameter("value");
				if (!sValue) {
					oBinding.filter([]);
				} else {

					var oFilter1 = new sap.ui.model.Filter("Landx", FilterOperator.EQ, sValue);

					oBinding.filter([oFilter1]);
				}

			},

			/* =========================================================== */
			/* Value Help for Region on Shipto  Address Popup          */
			/* =========================================================== */

			fragmentReg: null,
			regionOnF4: function (oEvent) {

				var that = this;
				var country = this.getView().getModel("tp").getProperty("Country", this.selectedRowAdd);
				var oFilter = new sap.ui.model.Filter("Land1", FilterOperator.EQ, country);
				var odataModel = new sap.ui.model.odata.v2.ODataModel("/sap/opu/odata/sap/ZQTC_FUTURE_RENEWAL_PLAN_SRV/");
				odataModel.read("/RegionSet", {
					filters: [oFilter],
					success: function (oData, resp) {
						var oModel = new sap.ui.model.json.JSONModel();
						oModel.setData(oData);
						that.getView().setModel(oModel, "reg");
						sap.ui.getCore().setModel(oModel);
						that.showRegions();
					},
					error: function (err) {

					}
				});

			},
			showRegions: function () {
				if (this.fragmentReg === null) {
					this.fragmentReg = new sap.ui.xmlfragment("ren.ZQTC_FUTURE_REN.view.fragmentReg", this);
					this.fragmentReg.bindAggregation("items", {
						path: "reg>/results",
						parameters: {
							//	operationMode: "Client"
						},
						template: new sap.m.DisplayListItem({
							label: "{reg>Bland}",
							value: "{reg>Bezei}"
						})
					});

					this.getView().addDependent(this.fragmentReg);
				}
				this.fragmentReg.open();
			},
			//Aftre clicking Ok on popup
			handleRegValueHelpConfirm: function (oEvent) {

				var selectedItem = oEvent.getParameter("selectedItem");

				var value = selectedItem.getLabel();
				//this.getView().getModel("tp").setProperty("Matnr",value,this.selectedRowPayMeth);
				sap.ui.getCore().byId("regionNew").setValue(value);
			},
			//Search on Popup regions
			onSearchRegionf4: function (oEvent) {

				var oBinding = oEvent.getParameter("itemsBinding");
				var sValue = oEvent.getParameter("value");
				//var country = this.getView().getModel("tp").getProperty("Country", this.selectedRowAdd);
				if (!sValue) {
					oBinding.filter([]);
				} else {
					var oFilter1 = new sap.ui.model.Filter("Bland", FilterOperator.EQ, sValue);
					var oFilter2 = new sap.ui.model.Filter("Bezei", FilterOperator.Contains, sValue);
					var oFilter = new sap.ui.model.Filter({
						filters: [
							oFilter1,
							oFilter2
						],
						and: false
					});
					oBinding.filter([oFilter]);
				}

			},
			/* =========================================================== */
			/* Value Help for Forwarding agent                             */
			/* =========================================================== */
			fragmenrFA: null,
			ffF4help: function (oEvent) {
				this.selectedRowFF = oEvent.getSource().getBindingContext("tp");
				this.inputFFId = oEvent.getSource().getId();
				if (this.fragmenrFA === null) {
					this.fragmenrFA = new sap.ui.xmlfragment("ren.ZQTC_FUTURE_REN.view.fragmentFF", this);
				}
				this.getView().addDependent(this.fragmenrFA);

				this.fragmenrFA.open();
			},
			cancelFF: function () {
				this.fragmenrFA.close();
			},
			ffSelect: function (oEvent) {

				var value = oEvent.getParameter("listItem").getBindingContext().getProperty("Lifnr");
				var valueOld = this.getView().getModel("tp").getProperty("KunffOld", this.selectedRowFF);

				this.getView().getModel("tp").setProperty("Kunff", value, this.selectedRowFF);
				//this.getView().byId(this.inputFFId).addStyleClass("row");
				this.getView().getModel("tp").setProperty("KunffOldSet", valueOld, this.selectedRowFF);
				//	this.getView().getModel("tp").setProperty("Maktx",desc,this.selectedRowProd);
				this.selectedRowFF.getObject().Color = "yellow";
				this.getView().byId(this.inputFFId).addCustomData(
					new sap.ui.core.CustomData({
						key: "colorCode",
						value: "{tp>Color}",
						writeToDom: true
					}));
				sap.ui.getCore().byId("myFFTable").removeSelections();
				if (value === valueOld) {
					//this.getView().byId(this.inputFFId).removeStyleClass("row");
					this.getView().byId(this.selectedRowFF).destroyCustomData();
					this.getView().getModel("tp").setProperty("KunffOldSet", "", this.selectedRowFF);
				}
				this.fragmenrFA.close();

			},
			searchFF: function (oEvent) {
				// var oBinding = oEvent.getParameter("itemsBinding");
				var sValue = oEvent.getParameter("query");

				var oFilter1 = new sap.ui.model.Filter("Name1", FilterOperator.EQ, sValue);
				var oTable = sap.ui.getCore().byId("myFFTable");
				//var oTable = this.fragmentSold.getContent()[1];
				var oTableItems = oTable.getBinding("items");
				oTableItems.filter([oFilter1]);
				// }	
			},
			resetFF: function () {

				var value = this.getView().getModel("tp").getProperty("KunffOld", this.selectedRowFF);
				this.getView().getModel("tp").setProperty("Kunff", value, this.selectedRowFF);
				this.getView().getModel("tp").setProperty("KunffOldSet", "", this.selectedRowFF);
				//	this.getView().byId(this.inputFFId).removeStyleClass("row");
				this.getView().byId(this.inputFFId).destroyCustomData();
				this.fragmenrFA.close();
			},
			/* =========================================================== */
			/* Fragment for Future Order Incomletion log                   */
			/* =========================================================== */
			fragmentIncomp: null,
			incompleteF4: function (oEvent) {
				var incompItem = oEvent.getSource().getBindingContext("tp");
				var that = this;
				var ord = this.getView().getModel("tp").getProperty("FutureOrd", incompItem);
				var oFilter = new sap.ui.model.Filter("Vbeln", FilterOperator.EQ, ord);
				var odataModel = new sap.ui.model.odata.v2.ODataModel("/sap/opu/odata/sap/ZQTC_FUTURE_RENEWAL_PLAN_SRV/");
				odataModel.read("/INCOMPLETESet", {
					filters: [oFilter],
					success: function (oData, resp) {
						var oModel = new sap.ui.model.json.JSONModel();
						oModel.setData(oData);
						that.getView().setModel(oModel, "incomp");
						sap.ui.getCore().setModel(oModel);
						that.showIncomplete();
					},
					error: function (err) {

					}
				});

			},
			showIncomplete: function () {
				if (this.fragmentIncomp === null) {
					this.fragmentIncomp = new sap.ui.xmlfragment("ren.ZQTC_FUTURE_REN.view.fragmentIncomp", this);
				}
				this.getView().addDependent(this.fragmentIncomp);

				this.fragmentIncomp.open();
			},
			cancelIncomp: function () {
				this.fragmentIncomp.close();
			},
			///////////// Process Order
			//	tableData: [],
			// tabLineSelected: function (oEvent) {
			/* =========================================================== */
			/* Make Row disable based on color when row gets try to selected */
			/* =========================================================== */
			rowSelection: function (oEvent) {

				var oTable = this.getView().byId("table");
				// var oRows = oTable.getRows();
				var oFtrOrd;
				var oExlStat;
				var oCancel;
				var oDistrict;
				try {
					oFtrOrd = oEvent.getParameter("rowContext").getProperty("FutureOrd");
				} catch (msg) {
					oFtrOrd = "";
				}
				try {
					oExlStat = oEvent.getParameter("rowContext").getProperty("ExclStatus");
				} catch (msg) {
					oExlStat = "";
				}
				try {
					oCancel = oEvent.getParameter("rowContext").getProperty("RenStatus");
				} catch (msg) {
					oCancel = "";
				}
				try {
					oDistrict = oEvent.getParameter("rowContext").getProperty("District");
				} catch (msg) {
					oDistrict = "";
				}
				var cInx = oEvent.getParameter("rowIndex");
				if (oFtrOrd || oDistrict === "Information" || oExlStat === "X" || oCancel === "C") {
					oTable.removeSelectionInterval(cInx, cInx);
				}
			},
			/* =========================================================== */
			/* Process actual Future order creation                       */
			/* =========================================================== */
			processEH: function (oEvent) {
				//Get Button source for BAPI return display
				this.btnSource = oEvent.getSource();
				//get Table data
			//	var modelData = this.getView().byId("table").getModel("tp").getData();
				//get selected row index, if not selected throw awarning message
				var items = this.getView().byId("table").getSelectedIndices();
				if (items.length === 0) {
					sap.m.MessageBox.warning("Please Select Items To Be Processed!");
				}
				//get all the required info to process future order 
				else {
				
					var tableData = [];
					for (var iRowIndex = 0; iRowIndex < items.length; iRowIndex++) {

						//var itemrow = modelData.results[items[iRowIndex]];
						var itemrow = this.getView().byId("table").getContextByIndex(items[iRowIndex]).getObject();
						var selData = {};
						selData.Vbeln = itemrow.Vbeln;
						selData.PosnrC = itemrow.PosnrC;
						selData.Vbegdat = itemrow.Vbegdat;
						selData.Venddat = itemrow.Venddat;
						selData.Kunag = itemrow.Kunag;
						selData.Kunwe = itemrow.Kunwe;
						selData.Matnr = itemrow.Matnr;
						selData.MatnrOld = itemrow.MatnrOld;
						selData.Zmeng = itemrow.Zmeng;
						selData.Price = itemrow.Price;
						selData.Kunff = itemrow.Kunff;
						selData.Zlsch = itemrow.Zlsch;
						selData.Abgru = itemrow.Abgru;
						selData.Street = itemrow.Street;
						selData.StrSuppl1 = itemrow.StrSuppl1;
						selData.StrSuppl2 = itemrow.StrSuppl2;
						selData.StrSuppl3 = itemrow.StrSuppl3;
						//selData.Street2 = itemrow.Street2;
						selData.Location = itemrow.Location;
						selData.City1 = itemrow.City1;
						selData.Country = itemrow.Country;
						selData.Region = itemrow.Region;
						selData.PostCode1 = itemrow.PostCode1;
						selData.AddressChg = itemrow.AddressChg;
						tableData.push(selData);
					}
					var that = this;

					this.getView().setBusy(true);
					//filll input with navigation property of deep entity
					var dataObject = {};
					dataObject.NP_VBELN = tableData;
					//Call create deep entity 
					var odataModel = new sap.ui.model.odata.v2.ODataModel("/sap/opu/odata/sap/ZQTC_FUTURE_RENEWAL_PLAN_SRV/");
					odataModel.create("/HeaderSet", dataObject, {
						//Sucess call back
						success: function (oData, resp) {
							that.getView().setBusy(false);
							var oIndices = that.getView().byId("table").getSelectedIndices();
							var ocModel = that.getView().byId("table").getModel("tp").getData().results;
							//for single record display message
							if (oData.NP_VBELN.results.length === 1 && oData.Message || oIndices.length > 5) {
								sap.m.MessageBox.success(oData.Message);
								//Modify JSON table
								for (var i = 0; i < oIndices.length; i++) {
									if (oIndices.length < 6) {
										ocModel[oIndices[i]].FutureOrd = oData.NP_VBELN.results[i].FutureOrd;
										ocModel[oIndices[i]].District = "Indication04";
									} else {
										ocModel[oIndices[i]].District = "Information";
									}
								}
								that.getView().byId("table").getModel("tp").updateBindings(true);
								that.getView().byId("table").clearSelection();
							}
							//for multiple messages, display it in Message PopOver
							else {
								var oModel = new JSONModel();
								oModel.setData(oData);
								that.getView().setModel(oModel, "msg");
								sap.ui.getCore().setModel(oModel);
								if (!that.notificationPopover) {
									that.oMessageTemplate = new sap.m.MessageItem({
										type: "{msg>Type}",
										title: "{msg>Vbeln} {msg>Posnr}",
										subtitle: "{msg>Posnr}",
										description: "{msg>Msg1} {msg>Msg2} {msg>Msg3}",
										text: "{msg>Msg2}",
										groupName: "abc"
									});
								}
								var oPopover = new sap.m.MessagePopover();
								oPopover.bindAggregation("items", {
									template: that.oMessageTemplate,
									path: "msg>/NP_VBELN/results"
								});
								that.notificationPopover = oPopover;
								that.getView().addDependent(that.notificationPopover);
								that.notificationPopover.openBy(that.btnSource);
								//Modify JSON table for multiple records return
								for (var iind = 0; iind < oIndices.length; iind++) {
									if (oData.NP_VBELN.results[iind].FutureOrd && oData.NP_VBELN.results[iind].Type === "Success") {
										ocModel[oIndices[iind]].FutureOrd = oData.NP_VBELN.results[iind].FutureOrd;
										ocModel[oIndices[iind]].District = "Indication04";
									}
								}
								that.getView().byId("table").getModel("tp").updateBindings(true);
							}

							that.getView().byId("table").clearSelection();
							//refresh data
							//	that.getData();

						},
						//Actual error from BAPI has been handled in Success call only with msg variables
						//Error call back below if any connectivity issue
						error: function (err) {
							that.getView().setBusy(false);
							sap.m.MessageBox.error("Error in Future Renewal Creation");
							//	that.getView().byId("table").clearSelection();

						}
					});

				}
			},
			/* =========================================================== */
			/* Main search on front end displayed data                   */
			/* =========================================================== */
			onMainSearch: function (oEvent) {

				var value = oEvent.getParameter("query");
				value.toUpperCase();
				var oFilter = new sap.ui.model.Filter("Vbeln", sap.ui.model.FilterOperator.Contains, value);
				var oFilter2 = new sap.ui.model.Filter("PosnrC", sap.ui.model.FilterOperator.Contains, value);
				var oFilter3 = new sap.ui.model.Filter("Vbegdat", sap.ui.model.FilterOperator.Contains, value);
				var oFilter4 = new sap.ui.model.Filter("Venddat", sap.ui.model.FilterOperator.Contains, value);
				var oFilter11 = new sap.ui.model.Filter("Kunag", sap.ui.model.FilterOperator.Contains, value);
				var oFilter12 = new sap.ui.model.Filter("KunagOldSet", sap.ui.model.FilterOperator.Contains, value);
				var oFilter13 = new sap.ui.model.Filter("Kunwe", sap.ui.model.FilterOperator.Contains, value);
				var oFilter5 = new sap.ui.model.Filter("NameWe", sap.ui.model.FilterOperator.Contains, value);
				var oFilter6 = new sap.ui.model.Filter("Matnr", sap.ui.model.FilterOperator.Contains, value);
				var oFilter7 = new sap.ui.model.Filter("MatnrOldSet", sap.ui.model.FilterOperator.Contains, value);
				var oFilter8 = new sap.ui.model.Filter("Zmeng", sap.ui.model.FilterOperator.Contains, value);
				var oFilter9 = new sap.ui.model.Filter("Netwr", sap.ui.model.FilterOperator.Contains, value);
				var oFilter10 = new sap.ui.model.Filter("Waerk", sap.ui.model.FilterOperator.Contains, value);
				var oFilter14 = new sap.ui.model.Filter("Zlsch", sap.ui.model.FilterOperator.Contains, value);
				var oFilter15 = new sap.ui.model.Filter("ExclStatus", sap.ui.model.FilterOperator.Contains, value);
				var oFilter16 = new sap.ui.model.Filter("RenwlProf", sap.ui.model.FilterOperator.Contains, value);
				var oFilter17 = new sap.ui.model.Filter("StatusText", sap.ui.model.FilterOperator.Contains, value);
				var oFilter18 = new sap.ui.model.Filter("RenContr", sap.ui.model.FilterOperator.Contains, value);
				var oTable = this.getView().byId("table");

				var oTableItems = oTable.getBinding("rows");

				var orFilter = new sap.ui.model.Filter({
					filters: [oFilter, oFilter2, oFilter3, oFilter4, oFilter5, oFilter6, oFilter7, oFilter8, oFilter9, oFilter10,
						oFilter11, oFilter12, oFilter13, oFilter14, oFilter15, oFilter16, oFilter17, oFilter18
					],
					and: false
				});
				var aFilter = [orFilter];
				oTableItems.filter(aFilter);
			},

			/* =========================================================== */
			/* Sort Reset          */
			/* =========================================================== */
			resetSort: function () {

				var oTable = this.getView().byId("table");
				// oTable.setEnableGrouping(false);
				//oTable.getColumns()[0].setGrouped(false);
				var aColumns = oTable.getColumns();
				for (var i = 0; i < aColumns.length; i++) {
					aColumns[i].setSorted(false);
					//	aColumns[i].setGrouped(false);
					aColumns[i].setFiltered(false);
					oTable.filter(aColumns[i], null);
				}
				this.getView().byId("searchField").setValue("");
				// var oListBinding = oTable.getBinding();
				// oListBinding.aSorters = null;
				// oListBinding.aFilters = null;
				oTable.getModel("tp").refresh(true);
				// oTable.setEnableGrouping(true);
			},
			/* =========================================================== */
			/* Table Personalization call              */
			/* =========================================================== */
			onPersoButtonPressed: function (oEvent) {

				this._oTPC.openDialog({

				});

			},
			/* =========================================================== */
			/* Excel download                                          */
			/* =========================================================== */
			downloadExcel: function () {
				var oTable = this.getView().byId("table");
				var aColumns = oTable.getColumns();
				var aTemplate = [];
				for (var i = 0; i < aColumns.length; i++) {
					var oColumn = {
						name: aColumns[i].getLabel().getText(),
						template: {
							content: {
								//	path: "/columns" + "/" + i
								path: aColumns[i].getProperty("filterProperty")
							}
						}
					};
					aTemplate.push(oColumn);
					if (i === 0 || i === 7) {
						aTemplate.pop(oColumn);
					}
				}
				//var oModel = oTable.getModel();
				var oModel = this.getView().getModel("tp");
				var oExport = new Export({

					exportType: new ExportType({
						mimeType: "application/vnd.ms-excel",
						fileExtension: "xls",
						separatorChar: "\t",
						charset: "utf-8"
					}),

					models: oModel,

					rows: {
						path: "/results"
					},
					columns: aTemplate

				});
				oExport.saveFile().catch(function (oError) {

					sap.m.MessageBox.error("error");
				}).then(function () {
					oExport.destroy();
				});
			},
			/* =========================================================== */
			/* default event handlers***not used in functionality       */
			/* =========================================================== */

			/**
			 * Triggered by the table's 'updateFinished' event: after new table
			 * data is available, this handler method updates the table counter.
			 * This should only happen if the update was successful, which is
			 * why this handler is attached to 'updateFinished' and not to the
			 * table's list binding's 'dataReceived' method.
			 * @param {sap.ui.base.Event} oEvent the update finished event
			 * @public
			 */
			onUpdateFinished: function (oEvent) {

				// update the worklist's object counter after the table update
				// var sTitle,
				// 	oTable = oEvent.getSource(),
				// 	iTotalItems = oEvent.getParameter("total");
				// // only update the counter if the length is final and
				// // the table is not empty
				// if (iTotalItems && oTable.getBinding("items").isLengthFinal()) {
				// 	sTitle = this.getResourceBundle().getText("worklistTableTitleCount", [iTotalItems]);
				// } else {
				// 	sTitle = this.getResourceBundle().getText("worklistTableTitle");
				// }
				// this.getModel("worklistView").setProperty("/worklistTableTitle", sTitle);
			},

			/**
			 * Event handler when a table item gets pressed
			 * @param {sap.ui.base.Event} oEvent the table selectionChange event
			 * @public
			 */
			onPress: function (oEvent) {
				// The source is the list item that got pressed
				// this._showObject(oEvent.getSource());
			},

			/**
			 * Event handler for navigating back.
			 * We navigate back in the browser history
			 * @public
			 */
			onNavBack: function () {
				// eslint-disable-next-line sap-no-history-manipulation
				history.go(-1);
			},

			// onSearch: function (oEvent) {
			// 	if (oEvent.getParameters().refreshButtonPressed) {
			// 		// Search field's 'refresh' button has been pressed.
			// 		// This is visible if you select any master list item.
			// 		// In this case no new search is triggered, we only
			// 		// refresh the list binding.
			// 		this.onRefresh();
			// 	} else {
			// 		var aTableSearchState = [];
			// 		var sQuery = oEvent.getParameter("query");

			// 		if (sQuery && sQuery.length > 0) {
			// 			aTableSearchState = [new Filter("Country", FilterOperator.Contains, sQuery)];
			// 		}
			// 		this._applySearch(aTableSearchState);
			// 	}

			// },

			/**
			 * Event handler for refresh event. Keeps filter, sort
			 * and group settings and refreshes the list binding.
			 * @public
			 */
			// onRefresh: function () {
			// 	var oTable = this.byId("table");
			// 	oTable.getBinding("items").refresh();
			// },

			/* =========================================================== */
			/* internal methods                                            */
			/* =========================================================== */

			/**
			 * Shows the selected item on the object page
			 * On phones a additional history entry is created
			 * @param {sap.m.ObjectListItem} oItem selected Item
			 * @private
			 */
			_showObject: function (oItem) {
				this.getRouter().navTo("object", {
					objectId: oItem.getBindingContext().getProperty("Vbeln")
				});
			}

			/**
			 * Internal helper method to apply both filter and search state together on the list binding
			 * @param {sap.ui.model.Filter[]} aTableSearchState An array of filters for the search
			 * @private
			 */
			// _applySearch: function (aTableSearchState) {
			// 	var oTable = this.byId("table"),
			// 		oViewModel = this.getModel("worklistView");
			// 	oTable.getBinding("items").filter(aTableSearchState, "Application");
			// 	// changes the noDataText of the list in case there are no filter results
			// 	if (aTableSearchState.length !== 0) {
			// 		oViewModel.setProperty("/tableNoDataText", this.getResourceBundle().getText("worklistNoDataWithSearchText"));
			// 	}
			// }

		});
	});