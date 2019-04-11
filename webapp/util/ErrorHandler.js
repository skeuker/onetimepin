sap.ui.define([
	"sap/ui/base/Object",
	"sap/m/MessageBox"
], function (UI5Object, MessageBox) {
	"use strict";

	return UI5Object.extend("pnp.survey.controller.ErrorHandler", {

		/**
		 * Handles application errors by automatically attaching to the model events and displaying errors when needed.
		 * @class
		 * @param {sap.ui.core.UIComponent} oComponent reference to the app's component
		 * @public
		 * @alias pnp.onetimepin.controller.ErrorHandler
		 */
		constructor: function (oComponent) {

			//set instance attributes
			this.oResourceBundle = oComponent.getModel("i18n").getResourceBundle();
			this.oComponent = oComponent;
			this.oOneTimePinModel = oComponent.getModel("OneTimePinModel");
			this.bMessageBoxOpen = false;
			this.sErrorText = this.oResourceBundle.getText("messageODataError");

			//attach error handler for metadata load failure
			this.oOneTimePinModel.attachMetadataFailed(function (oEvent) {
				
				//get failure notification
				var oParams = oEvent.getParameters();
				
				//render server or connectivity error
				this.showServiceError(oParams.response);
				
			}, this);

			//attach error handler for unhandled OData service request errors
			this.oOneTimePinModel.attachRequestFailed(function (oEvent) {

				//get service request failure event
				var oParams = oEvent.getParameters();

				//query if leading view controller delegates error handling
				var bErrorHandlingIsDelegated;
				if (this.oComponent.oLeadingViewController) {
					bErrorHandlingIsDelegated = this.oComponent.oLeadingViewController.delegatesODataErrorHandling(oParams.response.statusCode);
				}

				//Handle all errors delegated by view controllers
				if (bErrorHandlingIsDelegated) {
					this.showServiceError(oParams.response);
				}

			}, this);

		},

		//get message text from OData error response
		getODataErrorResponseMessageText: function (oError) {

			//called by OData model RequestFailed event
			var oResourceBundle = this.oResourceBundle;

			//called by view controller error handling
			if (!oResourceBundle) {
				oResourceBundle = this.getResourceBundle();
			}

			//local data declaration
			var sMessageText = oResourceBundle.getText("messageAnErrorOccured");

			//processing by response status code
			switch (oError.statusCode) {

				//socket timeout
			case 504:

				//set fixed message text
				sMessageText = oResourceBundle.getText("messageSocketTimeOutOccured");

				break;

				//all others
			default:

				//for exception handling
				try {

					//parse error response		
					var osErrorText = JSON.parse(oError.responseText);
					sMessageText = osErrorText.error.message.value;

					//exception handling
				} catch (exception) {

					//fallback to full error where not parsed
					sMessageText = oError.responseText;

				}

			}

			//feedback to caller
			return sMessageText;

		},

		/**
		 * Shows a {@link sap.m.MessageBox} when a service call has failed.
		 * Only the first error message will be display.
		 * @private
		 */
		showServiceError: function (oError) {

			//no further error message box where one is already open
			if (this.bMessageBoxOpen) {
				return;
			}

			//keep track that a message box is about to open
			this.bMessageBoxOpen = true;

			//open error message box
			MessageBox.error(

				//message box text
				this.sErrorText,

				//message box parameters
				{
					id: "serviceErrorMessageBox",
					icon: sap.m.MessageBox.Icon.Error,
					title: this.oResourceBundle.getText("titleServiceErrorMessageBox"),
					details: this.getODataErrorResponseMessageText(oError),
					styleClass: this.oComponent.getContentDensityClass(),
					actions: [MessageBox.Action.CLOSE],
					onClose: function () {
						this.bMessageBoxOpen = false;
					}.bind(this)
					
				}

			);
		}

	});

});