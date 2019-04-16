sap.ui.define([
	"sap/ui/core/UIComponent",
	"sap/ui/Device",
	"pnp/onetimepin/model/models",
	"pnp/onetimepin/util/ErrorHandler"
], function(UIComponent, Device, models, ErrorHandler) {
	"use strict";

	return UIComponent.extend("pnp.onetimepin.Component", {

		//metadata configuration
		metadata: {
			manifest: "json",

			//properties		
			properties: {

				//means of comm for OTP delivery
				aMeansOfCommunication: {
					type: "array",
					defaultValue: []
				},

				//message strip into which to send strip messages
				oOuterMessageStrip: {
					type: "object",
					defaultValue: null
				},

				//purpose of requesting an OTP
				sOTPPurpose: {
					type: "string",
					defaultValue: "Not specified"
				}

			},

			//event: One Time Pin validated
			events: {
				OneTimePinValidated: {
					parameters: {}
				}
			}

		},

		/**
		 * The component is initialized by UI5 automatically during the startup of the app and calls the init method once.
		 * @public
		 * @override
		 */
		init: function() {

			//initialize component attributes
			this.oErrorHandler = new ErrorHandler(this);

			// call the base component's init function
			UIComponent.prototype.init.apply(this, arguments);

			// set the device model
			this.setModel(models.createDeviceModel(), "device");

			//create the views based on the url/hash
			this.getRouter().initialize();

		},

		/**
		 * This method can be called to determine whether the sapUiSizeCompact or sapUiSizeCozy
		 * design mode class should be set, which influences the size appearance of some controls.
		 * @public
		 * @return {string} css class, either 'sapUiSizeCompact' or 'sapUiSizeCozy' - or an empty string if no css class should be set
		 */
		getContentDensityClass: function() {

			//determine content density class
			if (this.sContentDensityClass === undefined) {

				// check whether FLP has already set the content density class; do nothing in this case
				if (jQuery(document.body).hasClass("sapUiSizeCozy") || jQuery(document.body).hasClass("sapUiSizeCompact")) {
					this.sContentDensityClass = "";

					// apply "compact" mode if touch is not supported	
				} else if (!Device.support.touch) {
					this.sContentDensityClass = "sapUiSizeCompact";

					// "cozy" in case of touch support; default for most sap.m controls, but needed for desktop-first controls like sap.ui.table.Table
				} else {
					this.sContentDensityClass = "sapUiSizeCozy";
				}

			}

			//feedback to caller
			return this.sContentDensityClass;

		},

		//set outer message strip reference
		setOuterMessageStrip: function(oOuterMessageStrip) {

			//keep track of outer message strip control
			this.oOuterMessageStrip = oOuterMessageStrip;

		},

		//set means of communication
		setMeansOfCommunication: function(aMeansOfCommunication) {

			//get current OTP context
			var oOTPContext = sap.ui.getCore().getModel("AppViewModel").getProperty("/OTPContext");

			//keep track of means of communication for OTP delivery
			this.aMeansOfCommunication = aMeansOfCommunication;

			//set means of communication where available
			if (this.aMeansOfCommunication) {

				//adopt means of communication set on the component
				oOTPContext.MeansOfCommunication = this.aMeansOfCommunication;

				//default first available means of communication where applicable
				if (Array.isArray(oOTPContext.MeansOfCommunication) && oOTPContext.MeansOfCommunication.length > 0) {
					oOTPContext.SelectedMoCID = oOTPContext.MeansOfCommunication[0].MoCID;
				}

				//update means of communication in app view model
				sap.ui.getCore().getModel("AppViewModel").setProperty("/OTPContext/MeansOfCommunication", aMeansOfCommunication);

			}

		},

		//set OTP purpose 
		setOTPPurpose: function(sOTPPurpose) {

			//keep track of OTP purpose
			this.sOTPPurpose = sOTPPurpose;

		}

	});

});